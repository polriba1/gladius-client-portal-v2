-- Fix RLS policies for tickets_tecnics_bcn_sat so non-superadmin users of client "Tècnics BCN SAT" can view tickets
-- Root cause: previous policies matched client by name using ILIKE '%tecnics%' which fails due to the accent in "Tècnics".
-- Strategy: drop and recreate policies using exact client name equality and include both accented and non-accent variants for robustness.

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tickets_tecnics_bcn_sat' AND policyname = 'Tecnics users can view their tickets'
  ) THEN
    DROP POLICY "Tecnics users can view their tickets" ON public.tickets_tecnics_bcn_sat;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tickets_tecnics_bcn_sat' AND policyname = 'Tecnics users can insert tickets'
  ) THEN
    DROP POLICY "Tecnics users can insert tickets" ON public.tickets_tecnics_bcn_sat;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tickets_tecnics_bcn_sat' AND policyname = 'Tecnics users can update tickets'
  ) THEN
    DROP POLICY "Tecnics users can update tickets" ON public.tickets_tecnics_bcn_sat;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tickets_tecnics_bcn_sat' AND policyname = 'Tecnics users can delete tickets'
  ) THEN
    DROP POLICY "Tecnics users can delete tickets" ON public.tickets_tecnics_bcn_sat;
  END IF;
END$$;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.tickets_tecnics_bcn_sat ENABLE ROW LEVEL SECURITY;

-- Recreate SELECT policy (view)
CREATE POLICY "Tecnics users can view their tickets"
ON public.tickets_tecnics_bcn_sat
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (
        p.admin_role = 'super_admin'
        OR c.nom = 'Tècnics BCN SAT'
        OR c.nom ILIKE '%Tècnics%'
        OR c.nom ILIKE '%Tecnics%'
      )
  )
);

-- Recreate INSERT policy
CREATE POLICY "Tecnics users can insert tickets"
ON public.tickets_tecnics_bcn_sat
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (
        p.admin_role = 'super_admin'
        OR c.nom = 'Tècnics BCN SAT'
        OR c.nom ILIKE '%Tècnics%'
        OR c.nom ILIKE '%Tecnics%'
      )
  )
);

-- Recreate UPDATE policy
CREATE POLICY "Tecnics users can update tickets"
ON public.tickets_tecnics_bcn_sat
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (
        p.admin_role = 'super_admin'
        OR c.nom = 'Tècnics BCN SAT'
        OR c.nom ILIKE '%Tècnics%'
        OR c.nom ILIKE '%Tecnics%'
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (
        p.admin_role = 'super_admin'
        OR c.nom = 'Tècnics BCN SAT'
        OR c.nom ILIKE '%Tècnics%'
        OR c.nom ILIKE '%Tecnics%'
      )
  )
);

-- Recreate DELETE policy
CREATE POLICY "Tecnics users can delete tickets"
ON public.tickets_tecnics_bcn_sat
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clients c ON c.id = COALESCE(p.active_client_id, p.client_id)
    WHERE p.id = auth.uid()
      AND (
        p.admin_role = 'super_admin'
        OR c.nom = 'Tècnics BCN SAT'
        OR c.nom ILIKE '%Tècnics%'
        OR c.nom ILIKE '%Tecnics%'
      )
  )
);
