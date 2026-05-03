-- Pipeline stages (customizable by admin)
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#204CE5',
  position int NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('contacts','companies','both')),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','viewer')),
  created_at timestamptz DEFAULT now()
);

-- Contacts (LinkedIn via Apify)
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  company text,
  linkedin_url text UNIQUE,
  email text,
  phone text,
  location text,
  enrichment jsonb,
  score int DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  stage_id uuid REFERENCES pipeline_stages(id),
  assigned_to uuid REFERENCES profiles(id),
  campaign_id uuid,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Companies (Apollo.io API)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  size_range text,
  website text UNIQUE,
  headquarters text,
  employee_count int,
  revenue_range text,
  technologies jsonb,
  key_contacts jsonb,
  score int DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  stage_id uuid REFERENCES pipeline_stages(id),
  assigned_to uuid REFERENCES profiles(id),
  campaign_id uuid,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activities log
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('contact','company')),
  record_id uuid NOT NULL,
  type text NOT NULL,
  content text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Webhook logs
CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  records_received int DEFAULT 0,
  records_inserted int DEFAULT 0,
  status text DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

-- Default pipeline stages seed
INSERT INTO pipeline_stages (name, color, position, applies_to, is_default) VALUES
  ('Nuovo',         '#204CE5', 1, 'both', true),
  ('Contattato',    '#F59E0B', 2, 'both', false),
  ('In trattativa', '#8B5CF6', 3, 'both', false),
  ('Qualificato',   '#10B981', 4, 'both', false),
  ('Perso',         '#6B7280', 5, 'both', false);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read everything
CREATE POLICY "Auth users read contacts"
  ON contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users read companies"
  ON companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users read stages"
  ON pipeline_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users read activities"
  ON activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Write policies: authenticated users can insert/update
CREATE POLICY "Manager write contacts"
  ON contacts FOR ALL TO authenticated USING (true);

CREATE POLICY "Manager write companies"
  ON companies FOR ALL TO authenticated USING (true);

CREATE POLICY "Manager write activities"
  ON activities FOR ALL TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
