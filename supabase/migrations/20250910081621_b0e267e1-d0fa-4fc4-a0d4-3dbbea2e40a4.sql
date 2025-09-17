-- Create a SECURITY DEFINER helper to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND admin_role = 'super_admin'
  );
$$;

-- Remove recursive profiles policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage user roles and permissions" ON public.profiles;

-- Recreate non-recursive policies using the helper function
CREATE POLICY "Super admins can manage user roles and permissions"
ON public.profiles
FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_super_admin());