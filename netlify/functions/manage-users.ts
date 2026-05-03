import { createClient } from '@supabase/supabase-js'

interface NetlifyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
  queryStringParameters?: Record<string, string> | null
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

  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify JWT
  const token = (event.headers['authorization'] ?? '').replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Non autenticato' }) }
  }
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !caller) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Token non valido' }) }
  }

  // Verify admin role
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()
  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Solo gli amministratori possono gestire gli utenti' }) }
  }

  // GET — list all users
  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false })
    if (error) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ users: data }) }
  }

  // POST — create user
  if (event.httpMethod === 'POST') {
    const body = event.body ? JSON.parse(event.body) : {}
    const { email, password, name, role } = body as {
      email?: string
      password?: string
      name?: string
      role?: string
    }

    if (!email?.trim() || !password?.trim()) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Email e password sono obbligatori' }) }
    }
    if (password.trim().length < 6) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'La password deve essere di almeno 6 caratteri' }) }
    }

    const validRoles = ['admin', 'manager', 'viewer']
    const userRole = validRoles.includes(role ?? '') ? (role as string) : 'manager'

    const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
    })

    if (createError || !newUser) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: createError?.message ?? 'Creazione utente fallita' }) }
    }

    // Set profile with correct role
    await supabase.from('profiles').upsert({
      id: newUser.id,
      email: email.trim(),
      name: name?.trim() || null,
      role: userRole,
    })

    // Ensure subscription exists (trigger may already handle this)
    await supabase.from('subscriptions').upsert({
      user_id: newUser.id,
      plan: 'free',
      status: 'active',
      searches_used: 0,
      searches_limit: 100,
    }, { onConflict: 'user_id' })

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        user: { id: newUser.id, email: email.trim(), name: name?.trim() || null, role: userRole },
      }),
    }
  }

  // DELETE — remove user
  if (event.httpMethod === 'DELETE') {
    const userId = event.queryStringParameters?.id
    if (!userId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'ID utente obbligatorio' }) }
    }
    if (userId === caller.id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Non puoi eliminare il tuo account' }) }
    }

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ deleted: userId }) }
  }

  // PATCH — update user role
  if (event.httpMethod === 'PATCH') {
    const body = event.body ? JSON.parse(event.body) : {}
    const { id, role } = body as { id?: string; role?: string }

    if (!id || !role) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id e role obbligatori' }) }
    }
    if (!['admin', 'manager', 'viewer'].includes(role)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Ruolo non valido' }) }
    }
    if (id === caller.id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Non puoi cambiare il tuo ruolo' }) }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
    if (error) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ updated: id, role }) }
  }

  return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Metodo non consentito' }) }
}
