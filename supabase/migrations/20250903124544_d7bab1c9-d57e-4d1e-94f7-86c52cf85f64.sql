-- Strengthen RLS and privilege controls (batch)

-- 1) Protect call_logs_normalized (enable RLS and add client-scoped policy)
ALTER TABLE IF EXISTS public.call_logs_normalized ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view normalized call logs for their client" ON public.call_logs_normalized;
CREATE POLICY "Users can view normalized call logs for their client"
ON public.call_logs_normalized
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.client_id = call_logs_normalized.client_id OR
        p.active_client_id = call_logs_normalized.client_id
      )
  )
);

-- 2) Protect calls_summary (enable RLS and add client-scoped policy)
ALTER TABLE IF EXISTS public.calls_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view call summary for their client" ON public.calls_summary;
CREATE POLICY "Users can view call summary for their client"
ON public.calls_summary
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.client_id = calls_summary.client_id OR
        p.active_client_id = calls_summary.client_id
      )
  )
);

-- 3) Harden profiles updates to avoid privilege escalation
-- Create helper function to fetch immutable security fields (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_profile_security_fields(_id uuid)
RETURNS TABLE(admin_role public.admin_role, can_switch_clients boolean, client_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_role, can_switch_clients, client_id
  FROM public.profiles
  WHERE id = _id
$$;

-- Drop existing user-update policy (if present) and recreate with field check
DROP POLICY IF EXISTS "Users can update non-security fields of their profile" ON public.profiles;
CREATE POLICY "Users can update non-security fields of their profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (SELECT admin_role FROM public.get_profile_security_fields(id)) = admin_role
  AND (SELECT can_switch_clients FROM public.get_profile_security_fields(id)) = can_switch_clients
  AND (SELECT client_id FROM public.get_profile_security_fields(id)) = client_id
);

-- Ensure super-admin policy exists (drop and recreate to avoid duplicates)
DROP POLICY IF EXISTS "Super admins can manage user roles and permissions" ON public.profiles;
CREATE POLICY "Super admins can manage user roles and permissions"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.admin_role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.admin_role = 'super_admin'
  )
);
