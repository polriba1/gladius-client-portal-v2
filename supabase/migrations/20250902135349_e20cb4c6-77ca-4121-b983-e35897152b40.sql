-- Create function to set up admin user after signup
CREATE OR REPLACE FUNCTION public.setup_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'gladiuss.ai@gmail.com' THEN
    -- Update the user's profile to be super admin
    UPDATE public.profiles 
    SET 
      admin_role = 'super_admin',
      can_switch_clients = true
    WHERE id = NEW.id;
    
    -- Grant access to all clients for the super admin
    INSERT INTO public.admin_client_access (admin_user_id, client_id)
    SELECT NEW.id, c.id
    FROM public.clients c
    ON CONFLICT (admin_user_id, client_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user signup
DROP TRIGGER IF EXISTS setup_admin_user_trigger ON auth.users;
CREATE TRIGGER setup_admin_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_admin_user();