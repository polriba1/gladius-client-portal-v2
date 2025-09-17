-- Enable realtime for all relevant tables
ALTER TABLE call_logs_salutdental REPLICA IDENTITY FULL;
ALTER TABLE tickets_salutdental REPLICA IDENTITY FULL;
ALTER TABLE call_logs_tecnics_bcn_sat REPLICA IDENTITY FULL;
ALTER TABLE tickets_tecnics_bcn_sat REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs_salutdental;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_salutdental;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs_tecnics_bcn_sat;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_tecnics_bcn_sat;