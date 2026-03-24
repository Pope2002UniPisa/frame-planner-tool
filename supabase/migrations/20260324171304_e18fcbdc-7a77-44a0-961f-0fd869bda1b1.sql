
-- Add logo_url and supplier_logos to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS supplier_logos jsonb DEFAULT '{}'::jsonb;

-- News table
CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'Novità',
  image_url text DEFAULT '',
  link text DEFAULT '',
  social_link text DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published news
CREATE POLICY "Anyone can read published news" ON public.news
  FOR SELECT TO authenticated USING (published = true);

-- Admins can do everything on news
CREATE POLICY "Admins can manage news" ON public.news
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Portfolio images table
CREATE TABLE public.portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portfolio" ON public.portfolio_images
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage portfolio" ON public.portfolio_images
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
