-- Temporarily disable the security trigger
DROP TRIGGER IF EXISTS enforce_profile_security_trigger ON profiles;

-- Update the user to super_admin
UPDATE profiles 
SET admin_role = 'super_admin',
    can_switch_clients = true
WHERE id = 'c62662fa-e7a0-459d-868f-e1a7a487c0a2';

-- Grant access to all clients for the super admin
INSERT INTO admin_client_access (admin_user_id, client_id)
SELECT 'c62662fa-e7a0-459d-868f-e1a7a487c0a2', c.id
FROM clients c
ON CONFLICT (admin_user_id, client_id) DO NOTHING;

-- Re-enable the security trigger
CREATE TRIGGER enforce_profile_security_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_security();