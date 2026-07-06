-- Review workflow — collega measurements ai clienti con una FK vera (client_id),
-- non più per stringa client_name (fragile: rinomini un cliente e il link salta).

ALTER TABLE public.measurements
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.end_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_measurements_client_id ON public.measurements(client_id);

-- Backfill: collega le misurazioni esistenti al cliente con lo stesso nome (per dealer).
UPDATE public.measurements m
SET client_id = ec.id
FROM public.end_clients ec
WHERE m.client_id IS NULL
  AND ec.dealer_id = m.user_id
  AND lower(trim(ec.name)) = lower(trim(m.client_name));

-- D'ora in poi: alla creazione/rinomina, risolvi client_id dal nome automaticamente
-- (così il link resta senza toccare la UI; se il cliente non è in anagrafica resta null).
CREATE OR REPLACE FUNCTION public.set_measurement_client_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_id IS NULL AND NEW.client_name IS NOT NULL THEN
    SELECT ec.id INTO NEW.client_id
    FROM public.end_clients ec
    WHERE ec.dealer_id = NEW.user_id
      AND lower(trim(ec.name)) = lower(trim(NEW.client_name))
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_measurement_client_id ON public.measurements;
CREATE TRIGGER trg_set_measurement_client_id
  BEFORE INSERT OR UPDATE OF client_name ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_measurement_client_id();
