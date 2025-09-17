-- Enable RLS on call_logs_tecnics_bcn_sat table
ALTER TABLE call_logs_tecnics_bcn_sat ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for Tecnics BCN SAT call logs
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

CREATE POLICY "Tecnics users can insert call logs" 
ON call_logs_tecnics_bcn_sat 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN clients c ON (c.id = COALESCE(p.active_client_id, p.client_id))
    WHERE p.id = auth.uid() 
    AND (c.nom ILIKE '%tecnics%' OR p.admin_role = 'super_admin')
  )
);

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs_tecnics_bcn_sat;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_tecnics_bcn_sat;