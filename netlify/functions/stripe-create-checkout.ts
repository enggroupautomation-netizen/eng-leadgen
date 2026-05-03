import { createClient } from '@supabase/supabase-js'

interface NetlifyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
}

interface NetlifyResponse {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Verify JWT from Authorization header
  const authHeader = event.headers['authorization'] ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  // Read Stripe keys from app_settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['stripe_secret_key', 'stripe_price_id'])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const stripeSecretKey = settingsMap['stripe_secret_key']
  const priceId = settingsMap['stripe_price_id']

  if (!stripeSecretKey || !priceId) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Stripe non configurato. Inserisci le chiavi nelle Impostazioni.' }),
    }
  }

  // Fetch or create Stripe customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = subscription?.stripe_customer_id

  const body = event.body ? JSON.parse(event.body) : {}
  const successUrl = body.success_url ?? `${body.origin ?? 'https://example.com'}/abbonamento?success=true`
  const cancelUrl = body.cancel_url ?? `${body.origin ?? 'https://example.com'}/abbonamento?canceled=true`

  // Use Stripe REST API directly (no npm package needed)
  const stripeBase = 'https://api.stripe.com/v1'
  const authStr = `Basic ${Buffer.from(stripeSecretKey + ':').toString('base64')}`

  // Create or reuse customer
  if (!customerId) {
    const custRes = await fetch(`${stripeBase}/customers`, {
      method: 'POST',
      headers: { 'Authorization': authStr, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: user.email!, metadata: JSON.stringify({ user_id: user.id }) }).toString(),
    })
    const custData = await custRes.json() as { id: string }
    customerId = custData.id

    await supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id)
  }

  // Create Checkout Session
  const params = new URLSearchParams({
    'customer': customerId,
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'subscription_data[trial_period_days]': '0',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
    'client_reference_id': user.id,
    'allow_promotion_codes': 'true',
  })

  const sessionRes = await fetch(`${stripeBase}/checkout/sessions`, {
    method: 'POST',
    headers: { 'Authorization': authStr, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const session = await sessionRes.json() as { url?: string; error?: { message: string } }

  if (!session.url) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: session.error?.message ?? 'Checkout creation failed' }),
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ url: session.url }),
  }
}
