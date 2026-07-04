-- WS5 — Mappa territoriale: coordinate persistite (geocoding una sola volta).
-- leads ha già lat/lng (vedi 20260705100000). Qui: end_clients, measurements, appointments.

ALTER TABLE public.end_clients  ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.end_clients  ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.end_clients  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

-- appointments è stata creata nel dashboard (nessuna migration precedente):
-- aggiungiamo le colonne solo se la tabella esiste, senza ricrearla.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lat double precision;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lng double precision;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;
  END IF;
END $$;
