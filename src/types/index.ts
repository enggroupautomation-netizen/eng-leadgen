export type UserRole = 'admin' | 'manager' | 'viewer'

export interface Profile {
  id: string
  email: string
  name: string | null
  role: UserRole
  created_at: string
}

export type PipelineStage = {
  id: string
  name: string
  color: string
  position: number
  applies_to: 'contacts' | 'companies' | 'both'
  is_default: boolean
}

export interface Contact {
  id: string
  name: string
  role: string | null
  company: string | null
  linkedin_url: string | null
  email: string | null
  phone: string | null
  location: string | null
  enrichment: Record<string, unknown> | null
  score: number
  trust_score?: number
  stage_id: string | null
  stage?: PipelineStage
  assigned_to: string | null
  campaign_id: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  industry: string | null
  size_range: string | null
  website: string | null
  headquarters: string | null
  employee_count: number | null
  revenue_range: string | null
  technologies: string[] | null
  key_contacts: Array<{ name: string; role: string; email?: string; linkedin_url?: string }> | null
  score: number
  trust_score?: number
  stage_id: string | null
  stage?: PipelineStage
  assigned_to: string | null
  campaign_id: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'free' | 'premium'
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'trial_expired'
  trial_ends_at: string | null
  current_period_end: string | null
  searches_used: number
  searches_limit: number
  created_at: string
  updated_at: string
}

export interface KPIData {
  contacts_today: number
  companies_today: number
  contacts_total: number
  companies_total: number
  qualified_total: number
  last_sync: string | null
}
