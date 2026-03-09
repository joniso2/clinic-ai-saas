-- Enable RLS on processed_messages (was missing — cross-tenant data leak)
-- This table is only accessed via service role in webhook handlers,
-- but RLS provides defence-in-depth if the anon client ever touches it.

ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — all access is via service role.
-- Service role bypasses RLS. This means any non-service-role query
-- returns zero rows, which is the correct default-deny posture.
