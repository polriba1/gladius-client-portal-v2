-- PHASE 1: Fix Critical Data Exposure Issues

-- 1. Fix call_logs_tecnics_bcn_sat RLS policies
-- Remove overly permissive policies that allow anyone to access data
DROP POLICY IF EXISTS "INSERT" ON public.call_logs_tecnics_bcn_sat;
DROP POLICY IF EXISTS "SELECT" ON public.call_logs_tecnics_bcn_sat;

-- Create secure policies that require proper client association
CREATE POLICY "Users can view call logs for their client only" 
ON public.call_logs_tecnics_bcn_sat 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.client_id = call_logs_tecnics_bcn_sat.client_id 
      OR p.active_client_id = call_logs_tecnics_bcn_sat.client_id
    )
  )
);

CREATE POLICY "System can insert call logs with proper client association" 
ON public.call_logs_tecnics_bcn_sat 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only allow inserts if user has proper client association
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.client_id = call_logs_tecnics_bcn_sat.client_id 
      OR p.active_client_id = call_logs_tecnics_bcn_sat.client_id
      OR p.admin_role = 'super_admin'
    )
  )
);

-- 2. Fix tickets_salutdental RLS policies
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read Salutdental tickets" ON public.tickets_salutdental;
DROP POLICY IF EXISTS "Allow authenticated users to insert Salutdental tickets" ON public.tickets_salutdental;
DROP POLICY IF EXISTS "Allow authenticated users to update Salutdental tickets" ON public.tickets_salutdental;
DROP POLICY IF EXISTS "Allow authenticated users to delete Salutdental tickets" ON public.tickets_salutdental;

-- Create secure policies for Salutdental tickets
CREATE POLICY "Users can view Salutdental tickets for their client only" 
ON public.tickets_salutdental 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.clients c ON (p.client_id = c.id OR p.active_client_id = c.id)
    WHERE p.id = auth.uid() 
    AND c.nom = 'Salutdental'
  )
);

CREATE POLICY "Authorized users can manage Salutdental tickets" 
ON public.tickets_salutdental 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.clients c ON (p.client_id = c.id OR p.active_client_id = c.id)
    WHERE p.id = auth.uid() 
    AND (c.nom = 'Salutdental' OR p.admin_role = 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.clients c ON (p.client_id = c.id OR p.active_client_id = c.id)
    WHERE p.id = auth.uid() 
    AND (c.nom = 'Salutdental' OR p.admin_role = 'super_admin')
  )
);

-- 3. Fix call_logs_salutdental RLS policies
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read Salutdental calls" ON public.call_logs_salutdental;
DROP POLICY IF EXISTS "Allow authenticated users to insert Salutdental calls" ON public.call_logs_salutdental;

-- Create secure policies for Salutdental call logs
CREATE POLICY "Users can view Salutdental calls for their client only" 
ON public.call_logs_salutdental 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.clients c ON (p.client_id = c.id OR p.active_client_id = c.id)
    WHERE p.id = auth.uid() 
    AND c.nom = 'Salutdental'
  )
);

CREATE POLICY "Authorized users can insert Salutdental calls" 
ON public.call_logs_salutdental 
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.clients c ON (p.client_id = c.id OR p.active_client_id = c.id)
    WHERE p.id = auth.uid() 
    AND (c.nom = 'Salutdental' OR p.admin_role = 'super_admin')
  )
);

-- PHASE 2: Fix Admin Privilege Escalation

-- 4. Secure the profiles table to prevent users from escalating privileges
-- Remove the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create separate policies for different types of updates
CREATE POLICY "Users can update non-security fields of their profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND OLD.admin_role = NEW.admin_role  -- Prevent role changes
  AND OLD.can_switch_clients = NEW.can_switch_clients  -- Prevent permission changes
  AND OLD.client_id = NEW.client_id  -- Prevent client changes
);

-- Only super admins can modify security-critical fields
CREATE POLICY "Super admins can manage user roles and permissions" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.admin_role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.admin_role = 'super_admin'
  )
);

-- PHASE 3: Fix Database Function Security

-- 5. Update security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(active_client_id, client_id)
  FROM public.profiles
  WHERE id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_accessible_clients(_user_id uuid)
 RETURNS SETOF clients
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.*
  FROM public.clients c
  INNER JOIN public.admin_client_access aca ON c.id = aca.client_id
  WHERE aca.admin_user_id = _user_id
$function$;

-- 6. Add audit logging function for security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID,
  details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This would log to an audit table - for now just add a comment
  -- In production, you'd want to create an audit_logs table
  -- and insert the security event details there
  RAISE LOG 'Security Event: % by user % with details %', event_type, user_id, details;
END;
$function$;

-- 7. Create trigger to log admin role changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log admin role changes
  IF OLD.admin_role IS DISTINCT FROM NEW.admin_role THEN
    PERFORM public.log_security_event(
      'admin_role_change',
      auth.uid(),
      jsonb_build_object(
        'target_user', NEW.id,
        'old_role', OLD.admin_role,
        'new_role', NEW.admin_role
      )
    );
  END IF;
  
  -- Log client switching capability changes
  IF OLD.can_switch_clients IS DISTINCT FROM NEW.can_switch_clients THEN
    PERFORM public.log_security_event(
      'client_switch_permission_change',
      auth.uid(),
      jsonb_build_object(
        'target_user', NEW.id,
        'old_permission', OLD.can_switch_clients,
        'new_permission', NEW.can_switch_clients
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the audit trigger
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();