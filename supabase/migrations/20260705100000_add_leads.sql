-- WS1 — CRM Lead (pre-vendita). Sezione del back-office del singolo rivenditore.
-- Ogni dealer vede solo i propri lead (RLS su dealer_id), admin override.

CREATE TABLE IF NOT EXISTS public.leads (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  email                 text,
  phone                 text,
  address               text,
  city                  text,
  source                text        NOT NULL DEFAULT 'altro'
                          CHECK (source IN ('showroom','telefono','passaparola','sito','altro')),
  status                text        NOT NULL DEFAULT 'nuovo'
                          CHECK (status IN ('nuovo','contattato','preventivo_inviato','in_trattativa','vinto','perso')),
  estimated_value       numeric(12,2),
  next_action_at        timestamptz,                    -- promemoria richiamo
  notes                 text,
  -- geocoding per la mappa territoriale (WS5)
  lat                   double precision,
  lng                   double precision,
  geocoded_at           timestamptz,
  -- conversione a cliente/misura
  converted_client_id   uuid        REFERENCES public.end_clients(id) ON DELETE SET NULL,
  converted_measurement_id uuid     REFERENCES public.measurements(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_dealer_id      ON public.leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status         ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_at ON public.leads(next_action_at);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_leads" ON public.leads
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
CREATE POLICY "admin_all_leads" ON public.leads
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timeline attività del lead (note, chiamate, cambi di stato)
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  dealer_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'nota'
                CHECK (type IN ('nota','chiamata','email','cambio_stato')),
  note        text,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_lead_activities" ON public.lead_activities
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
