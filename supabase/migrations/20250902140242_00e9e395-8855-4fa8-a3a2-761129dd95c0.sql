-- Remove the problematic policy I just created
DROP POLICY IF EXISTS "Admins can view all profiles using function" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- The existing "read own profile" policy should be sufficient for admins to read their own profile
-- Let's ensure it works by recreating it cleanly
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
CREATE POLICY "read own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());