-- WS2 — Contatore tempi + mediane.
-- 1) Allarga la CHECK di measurements.status a tutti gli stati usati dall'app.
-- 2) Trigger che garantisce lo storico stati (fonte unica, niente buchi).
-- 3) Tabella generica operation_events per i tempi di ogni operazione.
-- 4) Viste durate/mediane (security_invoker: rispettano la RLS del dealer).

------------------------------------------------------------------------------
-- 1) CHECK allineata a src/lib/constants.ts (statusLabels)
------------------------------------------------------------------------------
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_status_check;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_status_check CHECK (
  status = ANY (ARRAY[
    'bozza','ricevuto','submitted','in_review','quoted','quote_accepted',
    'quote_modifications','ordered','in_production','delivering','completed'
  ]::text[])
);

------------------------------------------------------------------------------
-- 2) Trigger: logga OGNI cambio di stato in status_history.
--    Diventa la fonte garantita; le chiamate app annotano solo la "note".
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_measurement_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history (measurement_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_measurement_status ON public.measurements;
CREATE TRIGGER trg_log_measurement_status
  AFTER UPDATE OF status ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.log_measurement_status_change();

------------------------------------------------------------------------------
-- 3) operation_events: contatore tempi per ogni operazione (§8 Master List)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operation_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text        NOT NULL,          -- lead | measurement | quote | order | invoice ...
  entity_id   uuid,
  operation   text        NOT NULL,          -- es. 'lead_created','quote_sent','invoice_registered'
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_operation_events_dealer   ON public.operation_events(dealer_id);
CREATE INDEX IF NOT EXISTS idx_operation_events_entity   ON public.operation_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_operation_events_occurred ON public.operation_events(occurred_at);

ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_operation_events" ON public.operation_events
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
CREATE POLICY "admin_all_operation_events" ON public.operation_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

------------------------------------------------------------------------------
-- 4) Viste durate + mediane per transizione di stato
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_status_durations
WITH (security_invoker = on) AS
SELECT
  sh.measurement_id,
  m.user_id AS dealer_id,
  sh.old_status AS from_status,
  sh.new_status AS to_status,
  sh.changed_at,
  LAG(sh.changed_at) OVER (PARTITION BY sh.measurement_id ORDER BY sh.changed_at) AS prev_changed_at,
  EXTRACT(EPOCH FROM (
    sh.changed_at - LAG(sh.changed_at) OVER (PARTITION BY sh.measurement_id ORDER BY sh.changed_at)
  )) AS duration_seconds
FROM public.status_history sh
JOIN public.measurements m ON m.id = sh.measurement_id;

CREATE OR REPLACE VIEW public.v_status_median_durations
WITH (security_invoker = on) AS
SELECT
  dealer_id,
  from_status,
  to_status,
  count(*)                                                        AS transitions,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)   AS median_seconds,
  avg(duration_seconds)                                           AS avg_seconds
FROM public.v_status_durations
WHERE duration_seconds IS NOT NULL
GROUP BY dealer_id, from_status, to_status;
