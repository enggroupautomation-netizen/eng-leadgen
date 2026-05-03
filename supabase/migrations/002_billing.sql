-- App-level settings (Stripe keys, config, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read non-sensitive settings
CREATE POLICY "Authenticated users read public settings" ON app_settings
  FOR SELECT TO authenticated
  USING (key NOT IN ('stripe_secret_key', 'stripe_webhook_secret'));

-- Only service role can write (Netlify Functions)
-- No INSERT/UPDATE policy for anon/authenticated — only service role bypasses RLS

-- Default settings seed
INSERT INTO app_settings (key, value) VALUES
  ('stripe_publishable_key', ''),
  ('stripe_price_id', ''),
  ('stripe_secret_key', ''),
  ('stripe_webhook_secret', ''),
  ('trial_days', '30')
ON CONFLICT (key) DO NOTHING;


-- Subscriptions: one per user
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan                     text NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
  status                   text NOT NULL DEFAULT 'trialing', -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'trial_expired'
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  searches_used            int NOT NULL DEFAULT 0,
  searches_limit           int NOT NULL DEFAULT 500,       -- per plan period
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role handles all writes via Netlify Functions


-- Auto-create subscription on new user signup
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (
    NEW.id,
    'free',
    'trialing',
    now() + interval '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_subscription();


-- Billing events log
CREATE TABLE IF NOT EXISTS billing_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type   text NOT NULL,   -- 'checkout.session.completed', 'customer.subscription.updated', etc.
  stripe_event_id text UNIQUE,
  payload      jsonb,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own billing events" ON billing_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
