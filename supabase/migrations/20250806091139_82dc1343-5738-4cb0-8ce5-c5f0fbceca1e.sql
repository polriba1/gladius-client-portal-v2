-- Add RLS policies for tickets_tecnics_bcn_sat table
-- Allow authenticated users to SELECT all tickets (for now, can be restricted later)
CREATE POLICY "Allow authenticated users to select tickets" 
ON public.tickets_tecnics_bcn_sat 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to INSERT tickets
CREATE POLICY "Allow authenticated users to insert tickets" 
ON public.tickets_tecnics_bcn_sat 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to UPDATE tickets
CREATE POLICY "Allow authenticated users to update tickets" 
ON public.tickets_tecnics_bcn_sat 
FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to DELETE tickets
CREATE POLICY "Allow authenticated users to delete tickets" 
ON public.tickets_tecnics_bcn_sat 
FOR DELETE 
TO authenticated 
USING (true);