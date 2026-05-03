import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

interface NetlifyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
}

interface NetlifyResponse {
  statusCode: number
  body: string
}

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('='))) as Record<string, string>
  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')

  return expected === sig
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Read webhook secret from app_settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'stripe_webhook_secret')
    .single()

  const webhookSecret = settings?.value
  if (!webhookSecret) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Webhook secret not configured' }) }
  }

  const signature = event.headers['stripe-signature'] ?? ''
  const payload = event.body ?? ''

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) }
  }

  const stripeEvent = JSON.parse(payload) as {
    id: string
    type: string
    data: { object: Record<string, unknown> }
  }

  const obj = stripeEvent.data.object

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const userId = obj['client_reference_id'] as string
        const customerId = obj['customer'] as string
        const subscriptionId = obj['subscription'] as string
        if (!userId) break

        await supabase.from('subscriptions').update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: 'premium',
          status: 'active',
          searches_limit: 5000,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const subId = obj['id'] as string
        const status = obj['status'] as string
        const periodEnd = obj['current_period_end'] as number

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .single()

        if (sub) {
          await supabase.from('subscriptions').update({
            status: status === 'active' ? 'active' : status,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', subId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subId = obj['id'] as string
        await supabase.from('subscriptions').update({
          plan: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          searches_limit: 500,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subId)
        break
      }

      case 'invoice.payment_failed': {
        const customerId = obj['customer'] as string
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }
    }

    // Log event
    await supabase.from('billing_events').insert({
      event_type: stripeEvent.type,
      stripe_event_id: stripeEvent.id,
      payload: stripeEvent as unknown,
    }).then(() => {})

    return { statusCode: 200, body: JSON.stringify({ received: true }) }
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) }
  }
}
