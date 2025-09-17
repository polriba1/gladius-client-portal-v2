-- Tighten RLS on clients and parts tables to reduce data exposure

-- 1) Clients: restrict read access
-- Drop overly permissive SELECT policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON public.clients;

-- Ensure admins can still read/manage all clients
-- (There is already an ALL policy for admins; adding explicit SELECT for clarity)
DROP POLICY IF EXISTS "Admins can read all clients" ON public.clients;
CREATE POLICY "Admins can read all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.admin_role IN ('super_admin','client_admin')
  )
);

-- Normal users: only read their own client (or their active client if set)
DROP POLICY IF EXISTS "Users can read their client" ON public.clients;
CREATE POLICY "Users can read their client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.client_id = clients.id OR p.active_client_id = clients.id)
  )
);

-- 2) Parts: restrict who can view parts inventory/prices
DROP POLICY IF EXISTS "All authenticated users can view parts" ON public.parts;
DROP POLICY IF EXISTS "Privileged users can view parts" ON public.parts;
CREATE POLICY "Privileged users can view parts"
ON public.parts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'dispatcher')
  OR has_role(auth.uid(), 'technician')
);
