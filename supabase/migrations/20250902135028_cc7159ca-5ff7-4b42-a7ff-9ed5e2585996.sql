-- Create admin role in user_roles enum if not exists
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'client_admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add admin_role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_role admin_role DEFAULT 'user',
ADD COLUMN IF NOT EXISTS can_switch_clients boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS active_client_id uuid REFERENCES public.clients(id);

-- Create admin_client_access table for tracking which clients an admin can access
CREATE TABLE IF NOT EXISTS public.admin_client_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, client_id)
);

-- Enable RLS on admin_client_access
ALTER TABLE public.admin_client_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_client_access
CREATE POLICY "Super admins can manage all client access" 
ON public.admin_client_access 
FOR ALL 
USING ((SELECT admin_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own client access" 
ON public.admin_client_access 
FOR SELECT 
USING (admin_user_id = auth.uid());

-- Update profiles table policies to allow super admins to view all profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING ((SELECT admin_role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Create function to get admin accessible clients
CREATE OR REPLACE FUNCTION public.get_admin_accessible_clients(_user_id uuid)
RETURNS SETOF public.clients
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.clients c
  INNER JOIN public.admin_client_access aca ON c.id = aca.client_id
  WHERE aca.admin_user_id = _user_id
$$;

-- Create function to switch client context for admins
CREATE OR REPLACE FUNCTION public.switch_admin_client_context(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin and has access to this client
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.admin_role IN ('super_admin', 'client_admin')
    AND p.can_switch_clients = true
  ) THEN
    RETURN false;
  END IF;
  
  -- For super_admins, allow access to any client
  -- For client_admins, check specific access
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.admin_role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_client_access aca
    WHERE aca.admin_user_id = _user_id 
    AND aca.client_id = _client_id
  ) THEN
    UPDATE public.profiles 
    SET active_client_id = _client_id
    WHERE id = _user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;