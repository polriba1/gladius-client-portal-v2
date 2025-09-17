-- Update the user to super_admin so they can access all client data
UPDATE profiles 
SET admin_role = 'super_admin',
    can_switch_clients = true
WHERE id = 'c62662fa-e7a0-459d-868f-e1a7a487c0a2';