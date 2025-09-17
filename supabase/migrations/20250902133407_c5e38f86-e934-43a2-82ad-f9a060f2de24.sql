-- Create profiles for existing users with proper client associations
-- First, let's create the specific profiles for the two users

-- Insert profile for pol.ribaa@gmail.com (TecnicsBCN SAT client)
INSERT INTO public.profiles (id, client_id)
SELECT 
  u.id,
  c.id as client_id
FROM auth.users u
CROSS JOIN (
  SELECT id FROM public.clients 
  WHERE nom ILIKE '%tecnics%' OR nom ILIKE '%bcn%' OR nom ILIKE '%sat%'
  LIMIT 1
) c
WHERE u.email = 'pol.ribaa@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id;

-- Create Salutdental client if it doesn't exist
INSERT INTO public.clients (id, nom, color_principal, template)
VALUES (
  gen_random_uuid(),
  'Salutdental',
  '#2563eb',
  'dental'
) ON CONFLICT DO NOTHING;

-- Insert profile for pol@gladiusai.es (Salutdental client)
INSERT INTO public.profiles (id, client_id)
SELECT 
  u.id,
  c.id as client_id
FROM auth.users u
CROSS JOIN (
  SELECT id FROM public.clients 
  WHERE nom = 'Salutdental'
  LIMIT 1
) c
WHERE u.email = 'pol@gladiusai.es'
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id;

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine client based on email domain
  DECLARE
    target_client_id UUID;
  BEGIN
    IF NEW.email LIKE '%@gladiusai.es' THEN
      -- Assign to Salutdental
      SELECT id INTO target_client_id 
      FROM public.clients 
      WHERE nom = 'Salutdental' 
      LIMIT 1;
    ELSE
      -- Default to TecnicsBCN SAT or first available client
      SELECT id INTO target_client_id 
      FROM public.clients 
      WHERE nom ILIKE '%tecnics%' OR nom ILIKE '%bcn%' OR nom ILIKE '%sat%'
      LIMIT 1;
      
      -- If no TecnicsBCN client found, use first client
      IF target_client_id IS NULL THEN
        SELECT id INTO target_client_id 
        FROM public.clients 
        LIMIT 1;
      END IF;
    END IF;
    
    INSERT INTO public.profiles (id, client_id)
    VALUES (NEW.id, target_client_id)
    ON CONFLICT (id) DO UPDATE SET
      client_id = EXCLUDED.client_id;
      
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profiles table to allow updates for profile management
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);