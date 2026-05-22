-- Migration: email_drafts table
-- Run this in Supabase SQL editor (or via MCP execute_sql)

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES channel_connections(id) ON DELETE SET NULL,
  provider text NOT NULL,              -- gmail | outlook | icloud
  message_id text NOT NULL,            -- provider's original message ID
  thread_id text,
  subject text,
  from_email text,
  from_name text,
  original_snippet text,
  draft_body text NOT NULL,
  draft_provider_id text,              -- provider's draft ID (for direct send)
  status text NOT NULL DEFAULT 'pending', -- pending | sent | auto_sent | discarded
  auto_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, provider, message_id)
);

-- Index for fast lookup by business + status
CREATE INDEX IF NOT EXISTS email_drafts_business_status ON email_drafts(business_id, status);

-- RLS: only service role accesses this table (all API routes use SUPABASE_SERVICE_KEY)
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON email_drafts USING (false);
