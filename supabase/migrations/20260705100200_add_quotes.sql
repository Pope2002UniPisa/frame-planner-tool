-- WS3 — Motore preventivo a valle (IVA split 10/22 + detrazioni configurabili).
-- Modello additivo bidirezionale: netto acquisto -> ricarico/posa/trasporto -> IVA -> detrazione.

-- Aliquote IVA configurabili (mai hardcoded)
CREATE TABLE IF NOT EXISTS public.vat_rates (
  id       uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  rate     numeric(5,2) NOT NULL,            -- 4 / 10 / 22
  label    text    NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  active   boolean NOT NULL DEFAULT true
);
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_vat_rates"  ON public.vat_rates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_vat_rates" ON public.vat_rates FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.vat_rates (rate, label, is_default, active) VALUES
  (22, 'IVA ordinaria 22%', true,  true),
  (10, 'IVA agevolata 10% (ristrutturazione / beni significativi)', false, true),
  (4,  'IVA 4% (prima casa / agevolazioni)', false, true)
ON CONFLICT DO NOTHING;

-- Detrazioni fiscali configurabili (Ecobonus, Bonus Casa, ...)
CREATE TABLE IF NOT EXISTS public.detrazioni (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text    NOT NULL,
  percentage numeric(5,2) NOT NULL,          -- 50 / 65 ...
  cap        numeric(12,2),                  -- massimale di spesa (NULL = nessuno)
  note       text,
  active     boolean NOT NULL DEFAULT true
);
ALTER TABLE public.detrazioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_detrazioni"  ON public.detrazioni FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_detrazioni" ON public.detrazioni FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.detrazioni (name, percentage, cap, note, active) VALUES
  ('Bonus Ristrutturazione 50%', 50, 96000, 'Detrazione IRPEF 50% su recupero edilizio (da validare col commercialista).', true),
  ('Ecobonus 50% (infissi)',      50, 60000, 'Detrazione riqualificazione energetica — sostituzione infissi.', true),
  ('Ecobonus 65%',                65, NULL,  'Aliquota maggiorata per specifici interventi.', true)
ON CONFLICT DO NOTHING;

-- Preventivo a valle
CREATE TABLE IF NOT EXISTS public.quotes (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_id     uuid        REFERENCES public.measurements(id) ON DELETE SET NULL,
  lead_id            uuid        REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id          uuid        REFERENCES public.end_clients(id) ON DELETE SET NULL,
  title              text        NOT NULL DEFAULT 'Preventivo',
  subtotal_net       numeric(12,2) NOT NULL DEFAULT 0,   -- netto acquisto (a monte)
  markup_amount      numeric(12,2) NOT NULL DEFAULT 0,
  posa_amount        numeric(12,2) NOT NULL DEFAULT 0,
  trasporto_amount   numeric(12,2) NOT NULL DEFAULT 0,
  taxable_base       numeric(12,2) NOT NULL DEFAULT 0,   -- imponibile totale
  vat_10_base        numeric(12,2) NOT NULL DEFAULT 0,
  vat_22_base        numeric(12,2) NOT NULL DEFAULT 0,
  vat_amount         numeric(12,2) NOT NULL DEFAULT 0,
  detrazione_id      uuid        REFERENCES public.detrazioni(id) ON DELETE SET NULL,
  detrazione_amount  numeric(12,2) NOT NULL DEFAULT 0,
  total_gross        numeric(12,2) NOT NULL DEFAULT 0,   -- IVA inclusa
  total_net_of_bonus numeric(12,2) NOT NULL DEFAULT 0,   -- al netto del bonus
  status             text        NOT NULL DEFAULT 'bozza'
                       CHECK (status IN ('bozza','inviato','accettato','rifiutato')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotes_dealer      ON public.quotes(dealer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_measurement ON public.quotes(measurement_id);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_quotes" ON public.quotes
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
CREATE POLICY "admin_all_quotes" ON public.quotes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Righe del preventivo
CREATE TABLE IF NOT EXISTS public.quote_lines (
  id                  uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id            uuid    NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description         text    NOT NULL DEFAULT '',
  product_ref         text,
  qty                 numeric(10,2) NOT NULL DEFAULT 1,
  unit_net_price      numeric(12,2) NOT NULL DEFAULT 0,
  markup              numeric(12,2) NOT NULL DEFAULT 0,   -- ricarico sulla riga
  line_total          numeric(12,2) NOT NULL DEFAULT 0,   -- imponibile riga (qty*prezzo+ricarico)
  vat_rate            numeric(5,2)  NOT NULL DEFAULT 22,
  is_bene_significativo boolean NOT NULL DEFAULT false,
  sort_order          int     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON public.quote_lines(quote_id);

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_quote_lines" ON public.quote_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.dealer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.dealer_id = auth.uid())
  );
