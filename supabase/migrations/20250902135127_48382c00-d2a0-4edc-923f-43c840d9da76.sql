-- Create RLS policies for admin_client_access table
CREATE POLICY "Super admins can manage client access" 
ON public.admin_client_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND admin_role = 'super_admin'
  )
);

CREATE POLICY "Users can view their own client access" 
ON public.admin_client_access 
FOR SELECT 
USING (admin_user_id = auth.uid());

-- Create security definer functions for admin operations
CREATE OR REPLACE FUNCTION public.get_current_user_admin_role()
RETURNS admin_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_admin_accessible_clients(_user_id uuid)
RETURNS SETOF public.clients
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.clients c
  WHERE EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.admin_role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_client_access aca
    WHERE aca.admin_user_id = _user_id 
    AND aca.client_id = c.id
  );
$$;

CREATE OR REPLACE FUNCTION public.switch_admin_client_context(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin and has access to this client
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.admin_role IN ('super_admin', 'client_admin')
    AND p.can_switch_clients = true
  ) THEN
    RETURN false;
  END IF;
  
  -- For super_admins, allow access to any client
  -- For client_admins, check specific access
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.admin_role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_client_access aca
    WHERE aca.admin_user_id = _user_id 
    AND aca.client_id = _client_id
  ) THEN
    UPDATE public.profiles 
    SET active_client_id = _client_id
    WHERE id = _user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;