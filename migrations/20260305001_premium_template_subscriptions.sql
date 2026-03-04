-- Premium Template Subscriptions
-- Tracks which clients have active premium template subscriptions.
-- The actual template config and SEO data live in agency_clients.settings JSONB.
-- This table is for Stripe billing tracking and subscription lifecycle.

CREATE TABLE IF NOT EXISTS premium_template_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'vet-seo-worker',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'beta')),
  price_cents INTEGER NOT NULL DEFAULT 7900,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One premium template per client per type
  UNIQUE(client_id, template_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pts_agency ON premium_template_subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_pts_client ON premium_template_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_pts_status ON premium_template_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pts_stripe ON premium_template_subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE premium_template_subscriptions ENABLE ROW LEVEL SECURITY;

-- Agency members can read their own subscriptions
CREATE POLICY "Agency members can view own premium subscriptions"
  ON premium_template_subscriptions
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Agency owners can insert/update
CREATE POLICY "Agency owners can manage premium subscriptions"
  ON premium_template_subscriptions
  FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
