import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Netlify function handler type (inline to avoid @netlify/functions dependency)
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

const CompanySchema = z.object({
  name: z.string(),
  industry: z.string().optional(),
  size_range: z.string().optional(),
  website: z.string().url().optional(),
  headquarters: z.string().optional(),
  employee_count: z.number().int().positive().optional(),
  revenue_range: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  key_contacts: z.array(z.object({
    name: z.string(),
    role: z.string(),
    email: z.string().email().optional(),
    linkedin_url: z.string().url().optional(),
  })).optional(),
  score: z.number().min(0).max(100).default(0),
  enrichment: z.record(z.unknown()).optional(),
})

const PayloadSchema = z.object({
  source: z.literal('apollo'),
  campaign_id: z.string().uuid().optional(),
  companies: z.array(CompanySchema).min(1).max(500),
})

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Auth check
  const secret = event.headers['x-webhook-secret']
  if (secret !== process.env.WEBHOOK_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Parse + validate
  let payload: z.infer<typeof PayloadSchema>
  try {
    payload = PayloadSchema.parse(JSON.parse(event.body || '{}'))
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid payload', details: String(err) }),
    }
  }

  // Supabase service role (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Upsert (dedup by website)
  const rows = payload.companies.map(c => ({
    ...c,
    campaign_id: payload.campaign_id ?? null,
  }))

  const { data, error } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'website', ignoreDuplicates: false })
    .select('id')

  if (error) {
    console.error('Supabase error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }

  // Log webhook call
  await supabase.from('webhook_logs').insert({
    endpoint: 'webhook-companies',
    records_received: payload.companies.length,
    records_inserted: data?.length ?? 0,
    status: 'success',
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      inserted: data?.length ?? 0,
      received: payload.companies.length,
    }),
  }
}
