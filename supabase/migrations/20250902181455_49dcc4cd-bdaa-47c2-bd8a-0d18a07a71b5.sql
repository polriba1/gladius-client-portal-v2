-- Enable RLS on call_logs_salutdental table
ALTER TABLE public.call_logs_salutdental ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read Salutdental call logs
-- Since this is Salutdental-specific data, we'll allow access for authenticated users
CREATE POLICY "Allow authenticated users to read Salutdental calls" 
ON public.call_logs_salutdental 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow authenticated users to insert Salutdental call logs
CREATE POLICY "Allow authenticated users to insert Salutdental calls" 
ON public.call_logs_salutdental 
FOR INSERT 
TO authenticated 
WITH CHECK (true);