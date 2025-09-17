-- Fix security issues from the HVAC ticketing migration

-- 1. Fix search_path for all functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  year_part := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.hvac_tickets
  WHERE ticket_number LIKE year_part || '-%';
  
  sequence_part := LPAD(next_number::TEXT, 6, '0');
  
  RETURN year_part || '-' || sequence_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sla_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Calculate SLA response due date
  IF NEW.sla_response_hours IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.sla_response_due := NEW.created_at + (NEW.sla_response_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Calculate SLA resolution due date
  IF NEW.sla_resolution_hours IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.sla_resolution_due := NEW.created_at + (NEW.sla_resolution_hours || ' hours')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ticket_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  action_text TEXT;
  description_text TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_text := 'created';
    description_text := 'Ticket created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_text := 'updated';
    description_text := 'Ticket updated';
    
    -- Log specific status changes
    IF OLD.status != NEW.status THEN
      description_text := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
    END IF;
    
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      description_text := 'Assignment changed';
    END IF;
  END IF;
  
  INSERT INTO public.ticket_activity (
    ticket_id,
    user_id,
    action,
    description,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    action_text,
    description_text,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Enable RLS on any tables that might be missing it (just to be safe)
ALTER TABLE public.call_logs_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;