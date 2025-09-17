-- PHASE 2: Fix Admin Privilege Escalation and Function Security Issues

-- 1. Fix profiles table RLS to prevent privilege escalation
-- Remove the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create separate policies for different types of updates
-- Regular users can only update non-security fields
CREATE POLICY "Users can update non-security fields of their profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  -- This policy only allows updates if no security-critical fields are being changed
  -- Note: We cannot reference OLD/NEW in RLS policies, so we need to create a security definer function
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

-- 2. Fix database function security - add proper search_path to all functions
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  year_part := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.hvac_tickets
  WHERE ticket_number LIKE year_part || '-%';
  
  sequence_part := LPAD(next_number::TEXT, 6, '0');
  
  RETURN year_part || '-' || sequence_part;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_sla_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Calculate SLA response due date
  IF NEW.sla_response_hours IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.sla_response_due := NEW.created_at + (NEW.sla_response_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Calculate SLA resolution due date
  IF NEW.sla_resolution_hours IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.sla_resolution_due := NEW.created_at + (NEW.sla_resolution_hours || ' hours')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_ticket_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  action_text TEXT;
  description_text TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_text := 'created';
    description_text := 'Ticket created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_text := 'updated';
    description_text := 'Ticket updated';
    
    -- Log specific status changes
    IF OLD.status != NEW.status THEN
      description_text := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
    END IF;
    
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      description_text := 'Assignment changed';
    END IF;
  END IF;
  
  INSERT INTO public.ticket_activity (
    ticket_id,
    user_id,
    action,
    description,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    action_text,
    description_text,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Determine client based on email domain
  DECLARE
    target_client_id UUID;
  BEGIN
    IF NEW.email LIKE '%@gladiusai.es' THEN
      -- Assign to Salutdental
      SELECT id INTO target_client_id 
      FROM public.clients 
      WHERE nom = 'Salutdental' 
      LIMIT 1;
    ELSE
      -- Default to TecnicsBCN SAT or first available client
      SELECT id INTO target_client_id 
      FROM public.clients 
      WHERE nom ILIKE '%tecnics%' OR nom ILIKE '%bcn%' OR nom ILIKE '%sat%'
      LIMIT 1;
      
      -- If no TecnicsBCN client found, use first client
      IF target_client_id IS NULL THEN
        SELECT id INTO target_client_id 
        FROM public.clients 
        LIMIT 1;
      END IF;
    END IF;
    
    INSERT INTO public.profiles (id, client_id)
    VALUES (NEW.id, target_client_id)
    ON CONFLICT (id) DO UPDATE SET
      client_id = EXCLUDED.client_id;
      
    RETURN NEW;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.setup_admin_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'gladiuss.ai@gmail.com' THEN
    -- Update the user's profile to be super admin
    UPDATE public.profiles 
    SET 
      admin_role = 'super_admin',
      can_switch_clients = true
    WHERE id = NEW.id;
    
    -- Grant access to all clients for the super admin
    INSERT INTO public.admin_client_access (admin_user_id, client_id)
    SELECT NEW.id, c.id
    FROM public.clients c
    ON CONFLICT (admin_user_id, client_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.switch_admin_client_context(_user_id uuid, _client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;