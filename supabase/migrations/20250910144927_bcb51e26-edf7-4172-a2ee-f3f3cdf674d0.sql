-- Re-enable RLS and enforce least-privilege policy for call logs
ALTER TABLE call_logs_tecnics_bcn_sat ENABLE ROW LEVEL SECURITY;

-- Remove any overly permissive debug policy
DROP POLICY IF EXISTS "Authenticated users can view call logs" ON call_logs_tecnics_bcn_sat;

-- Ensure only authorized Tecnics BCN SAT users can view their own call logs
DROP POLICY IF EXISTS "Tecnics users can view their call logs" ON call_logs_tecnics_bcn_sat;
CREATE POLICY "Tecnics users can view their call logs"
ON call_logs_tecnics_bcn_sat
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN clients c ON (c.id = COALESCE(p.active_client_id, p.client_id))
    WHERE p.id = auth.uid()
    AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);