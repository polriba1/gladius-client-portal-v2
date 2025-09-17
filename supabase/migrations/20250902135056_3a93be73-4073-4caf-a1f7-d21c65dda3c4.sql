-- Create admin role enum if not exists
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'client_admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add admin columns to profiles table
DO $$ BEGIN
    ALTER TABLE public.profiles 
    ADD COLUMN admin_role admin_role DEFAULT 'user';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles 
    ADD COLUMN can_switch_clients boolean DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles 
    ADD COLUMN active_client_id uuid REFERENCES public.clients(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create admin_client_access table
CREATE TABLE IF NOT EXISTS public.admin_client_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, client_id)
);

-- Enable RLS
DO $$ BEGIN
    ALTER TABLE public.admin_client_access ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;