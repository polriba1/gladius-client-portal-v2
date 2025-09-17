-- Reconcile duplicate policies for tickets_tecnics_bcn_sat and enforce client-scoped RLS

-- Drop any existing client-scoped policies to avoid name collisions
DROP POLICY IF EXISTS "Tecnics users can view their tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Tecnics users can insert tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Tecnics users can update tickets" ON public.tickets_tecnics_bcn_sat;
DROP POLICY IF EXISTS "Tecnics users can delete tickets" ON public.tickets_tecnics_bcn_sat;

-- Recreate secure policies
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
