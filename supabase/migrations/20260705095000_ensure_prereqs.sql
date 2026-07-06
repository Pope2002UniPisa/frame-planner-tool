-- Prerequisiti idempotenti: su questo progetto (creato via dashboard) alcune
-- funzioni della prima migrazione non risultavano applicate al DB remoto, e la
-- colonna user_roles.role è TEXT (non l'enum app_role). Definiamo has_role su
-- TEXT così funziona indipendentemente dal tipo della colonna.

-- has_role(): usata nelle policy admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- update_updated_at_column(): usata dai trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
