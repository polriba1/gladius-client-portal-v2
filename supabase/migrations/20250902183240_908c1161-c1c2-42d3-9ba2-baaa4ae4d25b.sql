-- Update the get_salutdental_calls function to filter by last 7 days using timestamp
CREATE OR REPLACE FUNCTION get_salutdental_calls()
RETURNS TABLE (
  id bigint,
  "Data" text,
  "Telèfon" text,
  "Temps Trucada" text,
  "Score" text,
  "Resum" text,
  "Audio Trucada" text,
  "Transcripció Trucada" text,
  created_at timestamp with time zone,
  timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cls.id,
    cls."Data",
    cls."Telèfon",
    cls."Temps Trucada",
    cls."Score",
    cls."Resum",
    cls."Audio Trucada",
    cls."Transcripció Trucada",
    cls.created_at,
    cls.timestamp
  FROM call_logs_salutdental cls
  WHERE cls.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
  ORDER BY cls.timestamp DESC;
END;
$$;