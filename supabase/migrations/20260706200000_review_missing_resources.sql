-- Review fixes (2) — altre risorse "repaired ma mai eseguite" come payments.
-- Tutto idempotente: crea solo se manca, no-op se esiste.

-- (A) sales_objectives: tabella della feature Obiettivi (admin + Profile) — assente in prod.
CREATE TABLE IF NOT EXISTS public.sales_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_type text,
  brand text,
  target_count integer DEFAULT 0,
  target_amount numeric(10,2) DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  month integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_objectives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins can manage sales objectives" ON public.sales_objectives
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can view their own objectives" ON public.sales_objectives
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_sales_objectives_user ON public.sales_objectives(user_id);

-- (B) Bucket Storage 'catalogs' (upload cataloghi in AdminDashboard) — mai creato in
--     migrazione. Pubblico come 'logos'. + garantisco anche gli altri bucket usati.
INSERT INTO storage.buckets (id, name, public) VALUES ('catalogs','catalogs', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos','logos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('measurement-photos','measurement-photos', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Users can upload catalogs" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can view catalogs" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'catalogs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update catalogs" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'catalogs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
