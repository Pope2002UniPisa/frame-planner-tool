-- Aggiunge client_email alla tabella measurements
-- Campo opzionale: l'email del cliente finale a cui inviare notifiche di stato
ALTER TABLE public.measurements
  ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
