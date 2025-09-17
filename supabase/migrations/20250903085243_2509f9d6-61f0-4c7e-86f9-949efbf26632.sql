-- Enable RLS on the clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
CREATE POLICY "Allow authenticated users to read clients" 
ON clients 
FOR SELECT 
USING (true);

-- Allow admins to manage clients
CREATE POLICY "Allow admins to manage clients" 
ON clients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND admin_role IN ('super_admin', 'client_admin')
  )
);