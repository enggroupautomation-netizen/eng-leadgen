import type { Contact, Company, PipelineStage, KPIData } from '../types'

export const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL

export const MOCK_STAGES: PipelineStage[] = [
  { id: 's1', name: 'Nuovo',         color: '#204CE5', position: 1, applies_to: 'both', is_default: true },
  { id: 's2', name: 'Contattato',    color: '#F59E0B', position: 2, applies_to: 'both', is_default: false },
  { id: 's3', name: 'In trattativa', color: '#8B5CF6', position: 3, applies_to: 'both', is_default: false },
  { id: 's4', name: 'Qualificato',   color: '#10B981', position: 4, applies_to: 'both', is_default: false },
  { id: 's5', name: 'Perso',         color: '#6B7280', position: 5, applies_to: 'both', is_default: false },
]

export const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Marco Ferrari', role: 'CFO', company: 'Acme SRL', linkedin_url: 'https://linkedin.com/in/marco-ferrari', email: 'marco@acme.it', phone: '+39 333 1234567', location: 'Milano, IT', enrichment: { headline: 'CFO @ Acme | Finance Leader', connections: 500, industry: 'SaaS' }, score: 87, trust_score: 92, stage_id: 's4', stage: MOCK_STAGES[3], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2', name: 'Alessia Conti', role: 'CEO', company: 'StartupLab', linkedin_url: 'https://linkedin.com/in/alessia-conti', email: 'alessia@startuplab.io', phone: null, location: 'Roma, IT', enrichment: { headline: 'CEO @ StartupLab | Serial Entrepreneur', connections: 1200, industry: 'Fintech' }, score: 82, trust_score: 78, stage_id: 's1', stage: MOCK_STAGES[0], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3', name: 'Giovanni Russo', role: 'CTO', company: 'TechVenture', linkedin_url: 'https://linkedin.com/in/giovanni-russo', email: 'g.russo@techventure.io', phone: '+39 347 9876543', location: 'Torino, IT', enrichment: { headline: 'CTO | Cloud & AI', connections: 800, industry: 'Software' }, score: 75, trust_score: 65, stage_id: 's2', stage: MOCK_STAGES[1], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4', name: 'Chiara Moretti', role: 'VP Sales', company: 'GrowthCo', linkedin_url: null, email: 'chiara@growthco.it', phone: null, location: 'Firenze, IT', enrichment: null, score: 68, trust_score: 88, stage_id: 's3', stage: MOCK_STAGES[2], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c5', name: 'Luca Bianchi', role: 'Founder', company: 'NovaSRL', linkedin_url: 'https://linkedin.com/in/luca-bianchi', email: 'luca@novasrl.com', phone: '+39 366 5554433', location: 'Napoli, IT', enrichment: { headline: 'Founder & CEO @ NovaSRL', connections: 340, industry: 'E-commerce' }, score: 71, trust_score: 71, stage_id: 's1', stage: MOCK_STAGES[0], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 3600000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c6', name: 'Sara Pellegrini', role: 'Head of Marketing', company: 'DigitalFirst', linkedin_url: 'https://linkedin.com/in/sara-pellegrini', email: null, phone: null, location: 'Bologna, IT', enrichment: { headline: 'Marketing Leader | B2B SaaS', connections: 620, industry: 'Marketing' }, score: 60, trust_score: 55, stage_id: 's2', stage: MOCK_STAGES[1], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c7', name: 'Roberto Esposito', role: 'COO', company: 'ScaleUp SpA', linkedin_url: 'https://linkedin.com/in/roberto-esposito', email: 'roberto@scaleup.it', phone: '+39 320 1112223', location: 'Milano, IT', enrichment: { headline: 'COO @ ScaleUp | Operations Expert', connections: 900, industry: 'SaaS' }, score: 79, trust_score: 83, stage_id: 's1', stage: MOCK_STAGES[0], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'c8', name: 'Martina Greco', role: 'Product Manager', company: 'Innovatech', linkedin_url: 'https://linkedin.com/in/martina-greco', email: 'martina@innovatech.eu', phone: null, location: 'Genova, IT', enrichment: null, score: 55, trust_score: 48, stage_id: 's5', stage: MOCK_STAGES[4], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date().toISOString() },
]

export const MOCK_COMPANIES: Company[] = [
  { id: 'co1', name: 'Acme SRL', industry: 'SaaS / B2B', size_range: '51-200', website: 'https://acme.it', headquarters: 'Milano, IT', employee_count: 120, revenue_range: '5-20M€', technologies: ['HubSpot', 'Salesforce', 'AWS', 'Mixpanel'], key_contacts: [{ name: 'Marco Ferrari', role: 'CFO', email: 'marco@acme.it' }, { name: 'Elena Neri', role: 'CEO', email: 'elena@acme.it' }], score: 88, trust_score: 90, stage_id: 's1', stage: MOCK_STAGES[0], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'co2', name: 'TechVenture SpA', industry: 'Fintech', size_range: '201-1000', website: 'https://techventure.io', headquarters: 'Roma, IT', employee_count: 340, revenue_range: '20-50M€', technologies: ['Stripe', 'Google Cloud', 'Datadog'], key_contacts: [{ name: 'Giovanni Russo', role: 'CTO', email: 'g.russo@techventure.io' }], score: 74, trust_score: 72, stage_id: 's3', stage: MOCK_STAGES[2], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'co3', name: 'GreenTech SRL', industry: 'CleanTech', size_range: '1-50', website: 'https://greentech.eu', headquarters: 'Torino, IT', employee_count: 45, revenue_range: '<1M€', technologies: ['Shopify', 'Klaviyo'], key_contacts: [], score: 61, trust_score: 58, stage_id: 's1', stage: MOCK_STAGES[0], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'co4', name: 'ScaleUp SpA', industry: 'HR Tech', size_range: '51-200', website: 'https://scaleup.it', headquarters: 'Milano, IT', employee_count: 95, revenue_range: '1-5M€', technologies: ['Workday', 'Slack', 'Azure'], key_contacts: [{ name: 'Roberto Esposito', role: 'COO', email: 'roberto@scaleup.it' }], score: 80, trust_score: 80, stage_id: 's2', stage: MOCK_STAGES[1], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'co5', name: 'DigitalFirst Srl', industry: 'MarTech', size_range: '1-50', website: 'https://digitalfirst.io', headquarters: 'Bologna, IT', employee_count: 28, revenue_range: '<1M€', technologies: ['HubSpot', 'Zapier', 'Notion'], key_contacts: [], score: 55, trust_score: 61, stage_id: 's4', stage: MOCK_STAGES[3], assigned_to: null, campaign_id: null, raw_payload: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
]

export const MOCK_KPI: KPIData = {
  contacts_today: 3,
  companies_today: 2,
  contacts_total: 142,
  companies_total: 87,
  qualified_total: 18,
  last_sync: new Date(Date.now() - 1800000).toISOString(),
}
