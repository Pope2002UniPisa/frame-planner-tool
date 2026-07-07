-- Indici sulle foreign key non indicizzate (Performance Advisor, 21 FK).
-- Migliora i JOIN e rende veloci le cancellazioni dei record padre (senza
-- indice, un DELETE sul padre fa un seq scan della tabella figlia).
-- Idempotente (IF NOT EXISTS) e reversibile (DROP INDEX). Nessun lock rilevante
-- a questi volumi. Compariranno come "unused" finché non arriva traffico: normale.

CREATE INDEX IF NOT EXISTS idx_appointments_user_id            ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_assets_dealer_id                ON public.assets (dealer_id);
CREATE INDEX IF NOT EXISTS idx_coding_keywords_account_code    ON public.coding_keywords (account_code);
CREATE INDEX IF NOT EXISTS idx_coding_rules_account_code       ON public.coding_rules (account_code);
CREATE INDEX IF NOT EXISTS idx_dealer_quotes_client_id         ON public.dealer_quotes (client_id);
CREATE INDEX IF NOT EXISTS idx_dealer_quotes_detrazione_id     ON public.dealer_quotes (detrazione_id);
CREATE INDEX IF NOT EXISTS idx_dealer_quotes_lead_id           ON public.dealer_quotes (lead_id);
CREATE INDEX IF NOT EXISTS idx_files_order_id                  ON public.files (order_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by      ON public.lead_activities (created_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_dealer_id       ON public.lead_activities (dealer_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_client_id       ON public.leads (converted_client_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_measurement_id  ON public.leads (converted_measurement_id);
CREATE INDEX IF NOT EXISTS idx_measurements_product_id         ON public.measurements (product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id           ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id                 ON public.orders (quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id                  ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_measurement_id      ON public.quote_items (measurement_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id            ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id                  ON public.quotes (user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_order_id             ON public.signatures (order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_by       ON public.status_history (changed_by);
