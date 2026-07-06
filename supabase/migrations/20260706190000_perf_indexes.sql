-- Review fixes — (1) tabella payments MANCANTE in prod, (2) indici performance.
--
-- (1) BUG: la migrazione 20260325133136 era stata "repaired" (marcata applicata ma
--     mai eseguita) durante la riconciliazione della storia migrazioni, e il dashboard
--     non aveva creato la tabella. Risultato: `payments` non esiste in prod →
--     registrare un pagamento (PaymentSummary) fallisce silenziosamente. La ricreo
--     idempotente con RLS identica all'originale.
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'bonifico',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  invoice_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (2) Indici sulle colonne usate da RLS / JOIN / WHERE / ORDER BY delle tabelle calde.
--     Oggi il DB è minuscolo, ma le policy RLS filtrano user_id/dealer_id: senza indice,
--     a volume ogni query diventa seq scan. Additivo e reversibile.
CREATE INDEX IF NOT EXISTS idx_measurements_user_id       ON public.measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_user_created  ON public.measurements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_status        ON public.measurements(status);
CREATE INDEX IF NOT EXISTS idx_measurements_order_group   ON public.measurements(order_group_id);
CREATE INDEX IF NOT EXISTS idx_end_clients_dealer_id      ON public.end_clients(dealer_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id           ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_measurement_id    ON public.payments(measurement_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client    ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_dealer    ON public.client_documents(dealer_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id         ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date          ON public.appointments(date);
