-- Create a function to setup admin permissions for specific users
CREATE OR REPLACE FUNCTION public.setup_user_as_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user to super_admin with client switching capabilities
  UPDATE profiles 
  SET admin_role = 'super_admin',
      can_switch_clients = true
  WHERE id = _user_id;
  
  -- Grant access to all clients for the super admin
  INSERT INTO admin_client_access (admin_user_id, client_id)
  SELECT _user_id, c.id
  FROM clients c
  ON CONFLICT (admin_user_id, client_id) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Set up the specific user as super admin
SELECT setup_user_as_super_admin('c62662fa-e7a0-459d-868f-e1a7a487c0a2');