-- HVAC Ticketing System Database Schema

-- 1. User roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'dispatcher', 'technician', 'viewer');

-- 2. Ticket priority enum  
CREATE TYPE public.ticket_priority AS ENUM ('emergency', 'same_day', 'standard');

-- 3. Ticket status enum
CREATE TYPE public.ticket_status AS ENUM (
  'created', 'triaged', 'scheduled', 'assigned', 'en_route', 
  'on_site', 'in_progress', 'parts_needed', 'completed', 
  'invoiced', 'closed', 'cancelled'
);

-- 4. Equipment types enum
CREATE TYPE public.equipment_type AS ENUM (
  'air_conditioner', 'heat_pump', 'furnace', 'boiler', 'water_heater', 
  'ventilation_system', 'thermostat', 'air_filter', 'ductwork', 'other'
);

-- 5. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- 6. Equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  equipment_type equipment_type NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  warranty_expires DATE,
  contract_number TEXT,
  location_description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Parts catalog table
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Main HVAC tickets table
CREATE TABLE public.hvac_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  
  -- Customer info
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  requester_email TEXT,
  
  -- Location info  
  site_address TEXT NOT NULL,
  site_lat DECIMAL(10, 8),
  site_lng DECIMAL(11, 8),
  access_instructions TEXT,
  
  -- Equipment info
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  equipment_description TEXT,
  
  -- Ticket details
  priority ticket_priority NOT NULL DEFAULT 'standard',
  status ticket_status NOT NULL DEFAULT 'created',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  symptoms TEXT,
  tags TEXT[],
  
  -- Linked call data
  linked_call_id BIGINT REFERENCES public.call_logs_tecnics_bcn_sat(id) ON DELETE SET NULL,
  call_recording_url TEXT,
  call_transcript TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatcher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- SLA targets
  sla_response_hours INTEGER DEFAULT 24,
  sla_resolution_hours INTEGER DEFAULT 72,
  sla_response_due TIMESTAMP WITH TIME ZONE,
  sla_resolution_due TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Scheduling
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- minutes
  
  -- Labor tracking
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  labor_hours DECIMAL(8,2) DEFAULT 0,
  labor_rate DECIMAL(10,2),
  
  -- Financial
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  quote_id TEXT,
  invoice_id TEXT,
  
  -- Notes
  internal_notes TEXT,
  public_notes TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  triaged_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  assigned_at TIMESTAMP WITH TIME ZONE,
  en_route_at TIMESTAMP WITH TIME ZONE,
  on_site_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  invoiced_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Created by
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL
);

-- 9. Ticket attachments table
CREATE TABLE public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.hvac_tickets(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_public BOOLEAN DEFAULT FALSE
);

-- 10. Ticket parts used table
CREATE TABLE public.ticket_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.hvac_tickets(id) ON DELETE CASCADE NOT NULL,
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 11. Ticket activity log
CREATE TABLE public.ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.hvac_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hvac_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activity ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's client_id from profiles
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for equipment
CREATE POLICY "Users can view equipment for their client"
ON public.equipment FOR SELECT
USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Admins and dispatchers can manage equipment"
ON public.equipment FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dispatcher')
);

-- RLS Policies for parts
CREATE POLICY "All authenticated users can view parts"
ON public.parts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage parts"
ON public.parts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for hvac_tickets
CREATE POLICY "Users can view tickets for their client"
ON public.hvac_tickets FOR SELECT
USING (
  client_id = public.get_user_client_id(auth.uid()) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

CREATE POLICY "Admins and dispatchers can manage all tickets"
ON public.hvac_tickets FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dispatcher')
);

CREATE POLICY "Technicians can update assigned tickets"
ON public.hvac_tickets FOR UPDATE
USING (
  assigned_to = auth.uid() AND
  public.has_role(auth.uid(), 'technician')
);

CREATE POLICY "Users can create tickets for their client"
ON public.hvac_tickets FOR INSERT
WITH CHECK (
  client_id = public.get_user_client_id(auth.uid()) AND
  created_by = auth.uid()
);

-- RLS Policies for ticket_attachments
CREATE POLICY "Users can view attachments for accessible tickets"
ON public.ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hvac_tickets t
    WHERE t.id = ticket_id AND (
      t.client_id = public.get_user_client_id(auth.uid()) OR
      t.assigned_to = auth.uid() OR
      t.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload attachments to accessible tickets"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hvac_tickets t
    WHERE t.id = ticket_id AND (
      t.client_id = public.get_user_client_id(auth.uid()) OR
      t.assigned_to = auth.uid() OR
      t.created_by = auth.uid()
    )
  ) AND uploaded_by = auth.uid()
);

-- RLS Policies for ticket_parts
CREATE POLICY "Users can view parts for accessible tickets"
ON public.ticket_parts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hvac_tickets t
    WHERE t.id = ticket_id AND (
      t.client_id = public.get_user_client_id(auth.uid()) OR
      t.assigned_to = auth.uid() OR
      t.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Technicians and dispatchers can manage ticket parts"
ON public.ticket_parts FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dispatcher') OR
  (public.has_role(auth.uid(), 'technician') AND
   EXISTS (
     SELECT 1 FROM public.hvac_tickets t
     WHERE t.id = ticket_id AND t.assigned_to = auth.uid()
   ))
);

-- RLS Policies for ticket_activity
CREATE POLICY "Users can view activity for accessible tickets"
ON public.ticket_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hvac_tickets t
    WHERE t.id = ticket_id AND (
      t.client_id = public.get_user_client_id(auth.uid()) OR
      t.assigned_to = auth.uid() OR
      t.created_by = auth.uid()
    )
  )
);

-- Auto-generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.hvac_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_number();

-- Trigger to update SLA due dates
CREATE OR REPLACE FUNCTION public.calculate_sla_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER calculate_sla_dates_trigger
  BEFORE INSERT OR UPDATE ON public.hvac_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sla_dates();

-- Trigger to log ticket activity
CREATE OR REPLACE FUNCTION public.log_ticket_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER log_ticket_activity_trigger
  AFTER INSERT OR UPDATE ON public.hvac_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_activity();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hvac_tickets_updated_at
  BEFORE UPDATE ON public.hvac_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();