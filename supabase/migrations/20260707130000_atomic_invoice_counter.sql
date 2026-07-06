-- Perf/correttezza — progressivo fattura attiva atomico.
-- Sostituisce il pattern read-modify-write (SELECT last_number → +1 → upsert) con
-- una singola INSERT..ON CONFLICT DO UPDATE RETURNING: atomica e sicura anche con
-- emissioni concorrenti (nessun numero duplicato/saltato). Security invoker: la RLS
-- di invoice_counters (dealer_own) resta in vigore, dealer = auth.uid().
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_anno int)
RETURNS int
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.invoice_counters (dealer_id, anno, last_number)
  VALUES (auth.uid(), p_anno, 1)
  ON CONFLICT (dealer_id, anno)
    DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number;
$$;
