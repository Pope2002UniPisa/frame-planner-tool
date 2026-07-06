-- Fase 3 — doppio ciclo ordine→fattura (additiva).
-- Collega la scrittura contabile alla misurazione/ordine che l'ha generata, così
-- da (a) evitare doppioni (un attivo + un passivo per ordine), (b) mostrare le
-- bozze nella sezione "Ordini" e distinguerle da quelle da import XML.
-- Le fatture da ordine nascono con stato 'bozza' → escluse dal bilancio
-- (v_account_balances filtra stato='registrata') finché l'utente non le conferma.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS measurement_id uuid REFERENCES public.measurements(id) ON DELETE SET NULL;

-- Origine della scrittura: 'ordine' (auto da ordine) vs NULL (import XML/manuale).
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS origine text;

-- Flag: fattura passiva senza costo produttore (listino non ancora disponibile) →
-- resta bozza "in attesa costo".
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS incompleta boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_journal_entries_measurement
  ON public.journal_entries(measurement_id);
