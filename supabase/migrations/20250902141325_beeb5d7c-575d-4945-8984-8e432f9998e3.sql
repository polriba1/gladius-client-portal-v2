-- First, let's see which Salutdental client to keep (the one that has users)
-- We'll keep the one that's currently being used as active_client_id
-- Delete the duplicate Salutdental client that's not being used
DELETE FROM public.clients 
WHERE nom = 'Salutdental' 
AND id = '1e73e9b4-37a3-45c2-8e28-b46c9f914981';

-- Verify we now have only 2 clients
-- Update any references that might have used the deleted client ID