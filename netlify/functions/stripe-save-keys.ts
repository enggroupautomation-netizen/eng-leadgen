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

  // Verify JWT and admin role
  const authHeader = event.headers['authorization'] ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Admin only' }) }
  }

  const body = event.body ? JSON.parse(event.body) : {}
  const allowed = ['stripe_publishable_key', 'stripe_secret_key', 'stripe_price_id', 'stripe_webhook_secret', 'trial_days']

  const updates = Object.entries(body as Record<string, string>)
    .filter(([k]) => allowed.includes(k))
    .map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }))

  if (updates.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No valid keys provided' }) }
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert(updates, { onConflict: 'key' })

  if (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ saved: updates.map(u => u.key) }),
  }
}
