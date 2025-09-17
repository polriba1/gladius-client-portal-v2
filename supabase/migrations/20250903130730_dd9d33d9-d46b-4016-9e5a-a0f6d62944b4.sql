-- Secure call_logs_normalized by enabling RLS and adding client-scoped policies
-- Note: Even if this is a view, PostgREST respects RLS on the view in PG15+, but
-- underlying tables already have RLS. We also restrict direct access to authenticated users only.

-- 1) Enable RLS on the view/table
ALTER TABLE IF EXISTS public.call_logs_normalized ENABLE ROW LEVEL SECURITY;

-- 2) Drop any existing permissive policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all to read call_logs_normalized" ON public.call_logs_normalized;
DROP POLICY IF EXISTS "Authenticated can read all call_logs_normalized" ON public.call_logs_normalized;
DROP POLICY IF EXISTS "Users can read normalized calls for their client" ON public.call_logs_normalized;
DROP POLICY IF EXISTS "Admins can read all normalized calls" ON public.call_logs_normalized;

-- 3) Create restrictive SELECT policies
-- Admins (super_admin and client_admin) can read all rows
CREATE POLICY "Admins can read all normalized calls"
ON public.call_logs_normalized
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.admin_role IN ('super_admin','client_admin')
  )
);

-- Regular users can only read rows for their client (either client_id or via phone association if client_id is null)
-- Prefer client_id match when available
CREATE POLICY "Users can read normalized calls for their client"
ON public.call_logs_normalized
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        call_logs_normalized.client_id IS NOT NULL AND (
          p.client_id = call_logs_normalized.client_id OR p.active_client_id = call_logs_normalized.client_id
        )
      )
  )
);

-- Optional: If some rows lack client_id, block them by default (no extra policy). This prevents accidental leakage.

-- 4) Ensure no other access (no INSERT/UPDATE/DELETE on the view)
-- Nothing else needed; absence of policies blocks other commands.

-- 5) Harden by revoking PUBLIC privileges if any were granted (defensive)
REVOKE ALL ON TABLE public.call_logs_normalized FROM PUBLIC;