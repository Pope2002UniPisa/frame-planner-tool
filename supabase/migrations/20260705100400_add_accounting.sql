-- WS6 — Contabilità completa nel portale (port da contabilita_app).
-- Sezione del back-office del singolo rivenditore: tutte le tabelle-dati sono
-- dealer-scoped (RLS su dealer_id). Piano conti e keyword sono config condivise.
-- Gating della sezione via profiles.accounting_enabled (o admin).

-- Capability contabilità sul profilo del dealer
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accounting_enabled boolean NOT NULL DEFAULT false;

------------------------------------------------------------------------------
-- Piano dei conti (config condivisa, admin-editabile)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  code        text PRIMARY KEY,
  description text NOT NULL,
  type        text NOT NULL CHECK (type IN ('ATTIVO','PASSIVO','COSTO','RICAVO')),
  section     text                        -- sezione CEE (SP_*/CE_*)
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_chart"  ON public.chart_of_accounts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_chart" ON public.chart_of_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.chart_of_accounts (code, description, type, section) VALUES
  ('10','Immobilizzazioni materiali (cespiti)','ATTIVO','SP_B_II'),
  ('15','Crediti verso clienti','ATTIVO','SP_C_II_1'),
  ('18','IVA a credito','ATTIVO','SP_C_II_5bis'),
  ('20','Banca c/c','ATTIVO','SP_C_IV_1'),
  ('21','Cassa','ATTIVO','SP_C_IV_3'),
  ('40','Debiti verso fornitori','PASSIVO','SP_D_7'),
  ('45','IVA a debito','PASSIVO','SP_D_12'),
  ('48','Erario c/IVA (saldo da versare)','PASSIVO','SP_D_12'),
  ('60','Acquisto merci e materie prime','COSTO','CE_B_6'),
  ('61','Utenze (energia, gas, acqua)','COSTO','CE_B_7'),
  ('62','Carburante automezzi','COSTO','CE_B_7'),
  ('63','Manutenzione automezzi','COSTO','CE_B_7'),
  ('64','Manutenzione macchinari/impianti','COSTO','CE_B_7'),
  ('65','Servizi vari (consulenze, grafica, ecc.)','COSTO','CE_B_7'),
  ('66','Pasti e rappresentanza','COSTO','CE_B_7'),
  ('67','Affitti e locazioni','COSTO','CE_B_8'),
  ('68','Noleggi','COSTO','CE_B_8'),
  ('69','Materiale d''ufficio e consumo','COSTO','CE_B_6'),
  ('70','Ammortamento imm. materiali','COSTO','CE_B_10'),
  ('80','Ricavi delle vendite e prestazioni','RICAVO','CE_A_1')
ON CONFLICT (code) DO NOTHING;

------------------------------------------------------------------------------
-- Regole keyword (config condivisa) — porta REGOLE_KEYWORD da motore_codifica.py
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_keywords (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords     text[]  NOT NULL,
  account_code text    NOT NULL REFERENCES public.chart_of_accounts(code),
  priority     int     NOT NULL DEFAULT 100
);
ALTER TABLE public.coding_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_keywords"  ON public.coding_keywords FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_keywords" ON public.coding_keywords FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.coding_keywords (keywords, account_code, priority) VALUES
  (ARRAY['energia','enel','gas','acqua','luce','utenze','eni gas'],'61',10),
  (ARRAY['carburante','rifornimento','q8','benzina','gasolio','diesel','eni station'],'62',20),
  (ARRAY['officina','tagliando','riparazione furgone','riparazione auto','gomme','pneumatici'],'63',30),
  (ARRAY['manutenzione macchin','manutenzione impiant','riparazione macchin'],'64',40),
  (ARRAY['affitto','locazione','canone locazione','immobiliare'],'67',50),
  (ARRAY['noleggio','rent','autonoleggio'],'68',60),
  (ARRAY['pranzo','cena','ristorante','bar ','catering','pasti'],'66',70),
  (ARRAY['merci','materie prime','materiale per rivendita','acquisto merci'],'60',80),
  (ARRAY['cancelleria','materiale ufficio','toner','carta ','articoli ufficio'],'69',90),
  (ARRAY['consulenza','grafica','progettazione','servizi','pubblicit'],'65',100)
ON CONFLICT DO NOTHING;

------------------------------------------------------------------------------
-- Regole apprese fornitore->conto (per-dealer) — porta regole.json
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_rules (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piva         text    NOT NULL,
  account_code text    NOT NULL REFERENCES public.chart_of_accounts(code),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, piva)
);
ALTER TABLE public.coding_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_coding_rules" ON public.coding_rules
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

------------------------------------------------------------------------------
-- Dati azienda (per emissione fatture attive) — porta azienda.json
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_profile (
  dealer_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  denominazione  text NOT NULL DEFAULT '',
  piva           text NOT NULL DEFAULT '',
  codice_fiscale text NOT NULL DEFAULT '',
  regime_fiscale text NOT NULL DEFAULT 'RF01',
  nazione        text NOT NULL DEFAULT 'IT',
  codice_sdi     text NOT NULL DEFAULT '0000000',
  indirizzo      text NOT NULL DEFAULT '',
  cap            text NOT NULL DEFAULT '',
  comune         text NOT NULL DEFAULT '',
  provincia      text NOT NULL DEFAULT '',
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_company" ON public.company_profile
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
CREATE TRIGGER update_company_profile_updated_at BEFORE UPDATE ON public.company_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------------------------
-- Fatture parsate (coda import + registrate) — porta parser_fattura.py output
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices_raw (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chiave           text        NOT NULL,            -- piva|numero|data (anti-duplicato)
  file_url         text,
  fornitore        text        NOT NULL DEFAULT '',
  piva_fornitore   text        NOT NULL DEFAULT '',
  paese_fornitore  text        NOT NULL DEFAULT 'IT',
  cliente          text        NOT NULL DEFAULT '',
  tipo_doc         text        NOT NULL DEFAULT 'TD01',
  data             date,
  numero           text        NOT NULL DEFAULT '',
  imponibile       numeric(14,2) NOT NULL DEFAULT 0,
  imposta          numeric(14,2) NOT NULL DEFAULT 0,
  totale           numeric(14,2) NOT NULL DEFAULT 0,
  aliquota         numeric(5,2)  NOT NULL DEFAULT 0,
  natura           text        NOT NULL DEFAULT '',
  intra_ue         boolean     NOT NULL DEFAULT false,
  descrizione      text        NOT NULL DEFAULT '',
  proposed_account text,
  status           text        NOT NULL DEFAULT 'da_approvare'
                     CHECK (status IN ('da_approvare','registrata')),
  entry_id         uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, chiave)
);
CREATE INDEX IF NOT EXISTS idx_invoices_raw_dealer ON public.invoices_raw(dealer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_raw_status ON public.invoices_raw(status);
ALTER TABLE public.invoices_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_invoices_raw" ON public.invoices_raw
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

------------------------------------------------------------------------------
-- Libro giornale (registrazioni + righe) — porta giornale.json / scritture.py
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chiave      text        NOT NULL,                 -- anti-duplicato
  data        date        NOT NULL,
  controparte text        NOT NULL DEFAULT '',      -- fornitore/cliente
  numero      text        NOT NULL DEFAULT '',
  tipo        text        NOT NULL DEFAULT 'passiva'
                CHECK (tipo IN ('passiva','attiva','movimento')),
  mov_tipo    text,
  intra_ue    boolean     NOT NULL DEFAULT false,
  stato       text        NOT NULL DEFAULT 'registrata',
  note        text,
  source_xml_url text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, chiave)
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_dealer ON public.journal_entries(dealer_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_data   ON public.journal_entries(data);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_journal_entries" ON public.journal_entries
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     uuid    NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text    NOT NULL REFERENCES public.chart_of_accounts(code),
  descr        text    NOT NULL DEFAULT '',
  dare         numeric(14,2) NOT NULL DEFAULT 0,
  avere        numeric(14,2) NOT NULL DEFAULT 0,
  sort_order   int     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry   ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_code);
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_journal_lines" ON public.journal_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = journal_lines.entry_id AND e.dealer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = journal_lines.entry_id AND e.dealer_id = auth.uid())
  );

------------------------------------------------------------------------------
-- Cespiti (ammortamenti) — porta cespiti.json / ammortamenti.py
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descrizione   text    NOT NULL,
  valore        numeric(14,2) NOT NULL,
  anno_acquisto int     NOT NULL,
  perc_amm      numeric(5,2) NOT NULL DEFAULT 20,
  categoria     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_assets" ON public.assets
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

------------------------------------------------------------------------------
-- Progressivo fatture attive per anno — porta progressivo_fatture.json
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  dealer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anno        int  NOT NULL,
  last_number int  NOT NULL DEFAULT 0,
  PRIMARY KEY (dealer_id, anno)
);
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_counters" ON public.invoice_counters
  FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

------------------------------------------------------------------------------
-- Vista saldi per conto — porta giornale.saldi_per_conto (solo registrate)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_account_balances
WITH (security_invoker = on) AS
SELECT
  e.dealer_id,
  l.account_code,
  coa.description,
  coa.type,
  coa.section,
  sum(l.dare)  AS tot_dare,
  sum(l.avere) AS tot_avere,
  sum(l.dare) - sum(l.avere) AS saldo
FROM public.journal_lines l
JOIN public.journal_entries e ON e.id = l.entry_id AND e.stato = 'registrata'
JOIN public.chart_of_accounts coa ON coa.code = l.account_code
GROUP BY e.dealer_id, l.account_code, coa.description, coa.type, coa.section;

------------------------------------------------------------------------------
-- Prospetto IVA con filtro periodo — porta app._refresh_iva (con date filter)
-- Ritorna credito(18) / debito(45+48) / saldo per il dealer chiamante.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vat_report(p_from date, p_to date)
RETURNS TABLE (iva_credito numeric, iva_debito numeric, saldo numeric)
LANGUAGE sql
STABLE
AS $$
  WITH s AS (
    SELECT l.account_code,
           sum(l.dare)  AS d,
           sum(l.avere) AS a
    FROM public.journal_lines l
    JOIN public.journal_entries e ON e.id = l.entry_id
    WHERE e.dealer_id = auth.uid()
      AND e.stato = 'registrata'
      AND e.data BETWEEN p_from AND p_to
      AND l.account_code IN ('18','45','48')
    GROUP BY l.account_code
  ),
  agg AS (
    SELECT
      COALESCE(sum(d) FILTER (WHERE account_code = '18'), 0)
        - COALESCE(sum(a) FILTER (WHERE account_code = '18'), 0) AS credito,
      COALESCE(sum(a) FILTER (WHERE account_code IN ('45','48')), 0)
        - COALESCE(sum(d) FILTER (WHERE account_code IN ('45','48')), 0) AS debito
    FROM s
  )
  SELECT credito, debito, debito - credito FROM agg;
$$;

------------------------------------------------------------------------------
-- Storage bucket privato per gli XML delle fatture (dealer-scoped per cartella)
------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('fatture-xml','fatture-xml', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dealer_upload_fatture" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fatture-xml' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dealer_read_fatture" ON storage.objects FOR SELECT
  USING (bucket_id = 'fatture-xml' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dealer_delete_fatture" ON storage.objects FOR DELETE
  USING (bucket_id = 'fatture-xml' AND (storage.foldername(name))[1] = auth.uid()::text);
