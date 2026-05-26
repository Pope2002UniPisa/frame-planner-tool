-- Tabella per tracciare ogni cambio di stato di una misurazione
CREATE TABLE IF NOT EXISTS public.status_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id uuid       NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  old_status    text,                          -- null al primo inserimento
  new_status    text        NOT NULL,
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at    timestamptz DEFAULT now() NOT NULL,
  note          text                           -- nota opzionale (es. modifica richiesta)
);

-- Indice per ricerche veloci per misurazione
CREATE INDEX idx_status_history_measurement_id ON public.status_history(measurement_id);
CREATE INDEX idx_status_history_changed_at      ON public.status_history(changed_at);

-- Row Level Security
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Il rivenditore può leggere la storia delle proprie misurazioni
CREATE POLICY "Users can view own measurement status history"
  ON public.status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.measurements m
      WHERE m.id = status_history.measurement_id
        AND m.user_id = auth.uid()
    )
  );

-- Qualsiasi utente autenticato può inserire (admin + rivenditore)
CREATE POLICY "Authenticated users can insert status history"
  ON public.status_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
