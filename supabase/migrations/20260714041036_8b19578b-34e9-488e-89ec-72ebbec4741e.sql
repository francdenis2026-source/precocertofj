
ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_taken TEXT
    CHECK (action_taken IS NULL OR action_taken IN ('updated_price','marked_correct','no_action','duplicate'));

-- Allow admins to view every report (already covered by existing SELECT policy which
-- includes has_role check). Nothing to change there.

-- Nothing needed for INSERT since users insert their own; admin service_role bypasses RLS.
