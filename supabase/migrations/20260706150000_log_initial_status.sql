-- WS2 fix — Tempi/mediane: registra lo STATO INIZIALE alla creazione.
--
-- Problema: il trigger AFTER UPDATE OF status logga solo i cambi successivi.
-- La vista v_status_durations misura la durata come changed_at - LAG(changed_at):
-- perciò la PRIMA riga di una misurazione ha durata NULL (nessun timestamp
-- precedente) e viene esclusa. Risultato: dopo un solo cambio di stato la pagina
-- Tempi resta vuota, e il tempo "dalla creazione al primo stato" si perde.
--
-- Fix: alla INSERT logghiamo una riga iniziale (old=NULL, changed_at=created_at).
-- Così il primo passaggio di stato reale ha una base e diventa misurabile
-- (es. "Mediana → Preventivo" = tempo da creazione a 'quoted').

CREATE OR REPLACE FUNCTION public.log_measurement_initial_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.status_history (measurement_id, old_status, new_status, changed_by, changed_at)
  VALUES (NEW.id, NULL, NEW.status, NEW.user_id, COALESCE(NEW.created_at, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_measurement_initial_status ON public.measurements;
CREATE TRIGGER trg_log_measurement_initial_status
  AFTER INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.log_measurement_initial_status();

-- Backfill: crea la riga iniziale per le misurazioni esistenti che non hanno
-- ancora alcuno storico (una tantum), così anche i dati già presenti diventano
-- una base di partenza per i prossimi passaggi di stato.
INSERT INTO public.status_history (measurement_id, old_status, new_status, changed_by, changed_at)
SELECT m.id, NULL, m.status, m.user_id, m.created_at
FROM public.measurements m
WHERE NOT EXISTS (
  SELECT 1 FROM public.status_history sh WHERE sh.measurement_id = m.id
);
