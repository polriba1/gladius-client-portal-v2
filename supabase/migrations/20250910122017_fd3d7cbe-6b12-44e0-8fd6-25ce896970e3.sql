-- Enable realtime for Salutdental tables only (others might already be configured)
ALTER TABLE call_logs_salutdental REPLICA IDENTITY FULL;
ALTER TABLE tickets_salutdental REPLICA IDENTITY FULL;

-- Add Salutdental tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs_salutdental;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_salutdental;