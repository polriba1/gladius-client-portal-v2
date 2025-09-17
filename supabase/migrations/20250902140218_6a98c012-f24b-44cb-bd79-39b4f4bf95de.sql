-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND admin_role IN ('super_admin', 'client_admin')
  );
$$;

-- Create a new safe policy using the security definer function
CREATE POLICY "Admins can view all profiles using function" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR public.is_current_user_admin()
);