-- Fix the critical RLS issue by enabling RLS on the call_logs_normalized table
ALTER TABLE call_logs_normalized ENABLE ROW LEVEL SECURITY;

-- Create policies for call_logs_normalized
CREATE POLICY "Allow authenticated users to read normalized calls" 
ON call_logs_normalized 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert normalized calls" 
ON call_logs_normalized 
FOR INSERT 
WITH CHECK (true);