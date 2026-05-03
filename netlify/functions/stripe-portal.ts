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

  const authHeader = event.headers['authorization'] ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  // Get Stripe secret key + customer ID
  const [{ data: settings }, { data: subscription }] = await Promise.all([
    supabase.from('app_settings').select('key, value').eq('key', 'stripe_secret_key').single(),
    supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).single(),
  ])

  const stripeSecretKey = settings?.value
  const customerId = subscription?.stripe_customer_id

  if (!stripeSecretKey || !customerId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Nessun abbonamento attivo da gestire' }),
    }
  }

  const body = event.body ? JSON.parse(event.body) : {}
  const returnUrl = body.return_url ?? `${body.origin ?? 'https://example.com'}/abbonamento`

  const authStr = `Basic ${Buffer.from(stripeSecretKey + ':').toString('base64')}`

  const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { 'Authorization': authStr, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: customerId, return_url: returnUrl }).toString(),
  })

  const portal = await portalRes.json() as { url?: string; error?: { message: string } }

  if (!portal.url) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: portal.error?.message ?? 'Portal creation failed' }),
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ url: portal.url }),
  }
}
