-- Update RLS policy to allow super_admin users to view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  -- User can read their own profile
  auth.uid() = id
  OR
  -- Super admins can read all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.admin_role = 'super_admin'
  )
);