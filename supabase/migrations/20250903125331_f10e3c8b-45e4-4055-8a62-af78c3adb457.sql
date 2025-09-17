-- Secure tickets_tecnics_bcn_sat with client-scoped RLS without schema changes

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to select tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Allow authenticated users to insert tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Allow authenticated users to update tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Allow authenticated users to delete tickets" ON public.tickets_tecnics_bcn_sat;

-- Helper condition: user belongs to Tecnics BCN SAT (by client name) or is super admin
-- We inline this logic in each policy to avoid dependency and recursion issues

-- SELECT policy
CREATE POLICY "Tecnics users can view their tickets"
ON public.tickets_tecnics_bcn_sat
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);

-- INSERT policy
CREATE POLICY "Tecnics users can insert tickets"
ON public.tickets_tecnics_bcn_sat
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);

-- UPDATE policy
CREATE POLICY "Tecnics users can update tickets"
ON public.tickets_tecnics_bcn_sat
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);

-- DELETE policy
CREATE POLICY "Tecnics users can delete tickets"
ON public.tickets_tecnics_bcn_sat
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);
