-- Create function to get Salutdental call logs
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
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    id,
    "Data",
    "Telèfon", 
    "Temps Trucada",
    "Score",
    "Resum",
    "Audio Trucada",
    "Transcripció Trucada",
    created_at
  FROM public.call_logs_salutdental
  ORDER BY created_at DESC
  LIMIT 100;
$$;