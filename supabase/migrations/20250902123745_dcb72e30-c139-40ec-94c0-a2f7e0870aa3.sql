-- Enable realtime for the tickets table
ALTER TABLE public.tickets_tecnics_bcn_sat REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets_tecnics_bcn_sat;