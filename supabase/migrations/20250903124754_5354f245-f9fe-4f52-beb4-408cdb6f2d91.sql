-- Harden profiles updates to avoid privilege escalation (safe for views/tables)

-- Helper function to fetch current security fields without RLS recursion
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

-- Recreate controlled user update policy
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

-- Ensure super-admin policy exists
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
