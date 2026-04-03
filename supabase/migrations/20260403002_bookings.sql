-- ============================================================================
-- Bookings & AI Booking Configuration
-- Enables AI-powered appointment booking via conversation
-- ============================================================================

-- ── Client Bookings Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  service TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')),
  notes TEXT,
  booked_via TEXT NOT NULL DEFAULT 'ai'
    CHECK (booked_via IN ('ai', 'manual', 'widget')),
  ghl_appointment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON client_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON client_bookings(agency_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON client_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON client_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_contact ON client_bookings(contact_id);

-- ── Booking Configuration (per client) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_booking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  available_hours JSONB NOT NULL DEFAULT '{
    "monday":    {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday":   {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday":  {"start": "09:00", "end": "17:00", "enabled": true},
    "friday":    {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday":  {"start": "09:00", "end": "17:00", "enabled": false},
    "sunday":    {"start": "09:00", "end": "17:00", "enabled": false}
  }'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  appointment_duration INT NOT NULL DEFAULT 60,
  buffer_minutes INT NOT NULL DEFAULT 0,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmation_template TEXT DEFAULT 'Your appointment has been confirmed for {date} at {time}. See you then!',
  booking_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_config_client ON client_booking_config(client_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE client_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_booking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view bookings"
  ON client_bookings FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage bookings"
  ON client_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agency members can view booking config"
  ON client_booking_config FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage booking config"
  ON client_booking_config FOR ALL
  USING (true)
  WITH CHECK (true);
