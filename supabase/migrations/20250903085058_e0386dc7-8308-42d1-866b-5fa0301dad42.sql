-- Enable RLS on tickets_salutdental if not already enabled
ALTER TABLE tickets_salutdental ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tickets_salutdental similar to call_logs_salutdental
CREATE POLICY "Allow authenticated users to read Salutdental tickets" 
ON tickets_salutdental 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert Salutdental tickets" 
ON tickets_salutdental 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update Salutdental tickets" 
ON tickets_salutdental 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow authenticated users to delete Salutdental tickets" 
ON tickets_salutdental 
FOR DELETE 
USING (true);