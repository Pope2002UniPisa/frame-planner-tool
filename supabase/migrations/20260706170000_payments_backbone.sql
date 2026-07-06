-- Riconciliazione pagamenti — FASE 1: fondazione (additiva, nessun rischio fiscale).
-- Predispone il backbone "pronto per Open Banking PSD2": codice pagamento per
-- ordine + tabella movimenti bancari (target di import CSV oggi, PSD2 domani).
-- + anagrafica: P.IVA/SDI sul cliente e IBAN azienda (servono a fatture e incassi).

-- 1) Anagrafica cliente: P.IVA e codice SDI (per fattura attiva e riconciliazione).
ALTER TABLE public.end_clients   ADD COLUMN IF NOT EXISTS piva       text;
ALTER TABLE public.end_clients   ADD COLUMN IF NOT EXISTS codice_sdi text;

-- 2) Dati azienda: IBAN da stampare sul foglio pagamento / QR.
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS iban text;

-- 3) Codice pagamento univoco per ordine (da mettere nella causale del bonifico).
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS payment_code text;

-- Genera un codice numerico a 10 cifre (come l'esempio "1234567890").
CREATE OR REPLACE FUNCTION public.gen_payment_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT to_char(floor(random() * 9000000000) + 1000000000, 'FM0000000000');
$$;

-- Assegna il codice alla creazione dell'ordine (se non già presente).
CREATE OR REPLACE FUNCTION public.set_measurement_payment_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_code IS NULL THEN
    NEW.payment_code := public.gen_payment_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payment_code ON public.measurements;
CREATE TRIGGER trg_set_payment_code
  BEFORE INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_measurement_payment_code();

-- Backfill: un codice per ogni ordine esistente che non ne ha.
UPDATE public.measurements SET payment_code = public.gen_payment_code()
WHERE payment_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_payment_code
  ON public.measurements(payment_code);

-- 4) Movimenti bancari: target unico di import (CSV oggi, PSD2 domani).
--    La riconciliazione abbina il movimento all'ordine cercando payment_code
--    nella causale, poi registra il pagamento (tabella payments).
CREATE TABLE IF NOT EXISTS public.bank_movements (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_date date        NOT NULL,
  amount        numeric     NOT NULL,               -- positivo = accredito
  causale       text        NOT NULL DEFAULT '',
  source        text        NOT NULL DEFAULT 'csv',  -- csv | paypal | psd2
  external_id   text,                                -- id univoco della fonte (anti-duplicato PSD2)
  matched_code  text,                                -- payment_code riconosciuto
  payment_id    uuid,                                -- pagamento generato (se abbinato)
  status        text        NOT NULL DEFAULT 'da_abbinare', -- da_abbinare | abbinato | ignorato
  raw           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_movements_dealer ON public.bank_movements(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bank_movements_code   ON public.bank_movements(matched_code);
-- Anti-duplicato per import ripetuti dalla stessa fonte.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_movements_ext
  ON public.bank_movements(dealer_id, source, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.bank_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_bank_movements" ON public.bank_movements
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
CREATE POLICY "admin_all_bank_movements" ON public.bank_movements
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
