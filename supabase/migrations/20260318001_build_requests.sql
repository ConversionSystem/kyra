-- Build requests: custom AI worker intake form submissions
CREATE TABLE IF NOT EXISTS build_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  business_url text,
  worker_types text[] NOT NULL DEFAULT '{}',
  description text,
  budget_range text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'completed', 'declined')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE build_requests ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read (API route uses service client)
CREATE POLICY "Service role full access" ON build_requests
  FOR ALL USING (true) WITH CHECK (true);
