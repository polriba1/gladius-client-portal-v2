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