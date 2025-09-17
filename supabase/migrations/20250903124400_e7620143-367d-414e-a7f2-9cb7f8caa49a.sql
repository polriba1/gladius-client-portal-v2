-- Add validation trigger to prevent privilege escalation on profiles

CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_super_admin boolean;
BEGIN
  -- Determine if the acting user is a super admin
  SELECT (admin_role = 'super_admin') INTO is_super_admin
  FROM public.profiles WHERE id = auth.uid();

  -- If not super admin, block changes to security-critical fields
  IF NOT COALESCE(is_super_admin, false) THEN
    IF NEW.admin_role IS DISTINCT FROM OLD.admin_role THEN
      RAISE EXCEPTION 'Updating admin_role is not permitted.' USING ERRCODE = '42501';
    END IF;
    IF NEW.can_switch_clients IS DISTINCT FROM OLD.can_switch_clients THEN
      RAISE EXCEPTION 'Updating can_switch_clients is not permitted.' USING ERRCODE = '42501';
    END IF;
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'Updating client_id is not permitted.' USING ERRCODE = '42501';
    END IF;
    -- Allow active_client_id updates for admins only via RPC; block normal users
    IF NEW.active_client_id IS DISTINCT FROM OLD.active_client_id THEN
      RAISE EXCEPTION 'Updating active_client_id directly is not permitted.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_profile_security_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_security_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_security();