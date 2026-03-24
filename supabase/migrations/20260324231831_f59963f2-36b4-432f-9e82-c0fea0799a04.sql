CREATE TABLE public.sales_objectives (
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

CREATE POLICY "Admins can manage sales objectives"
  ON public.sales_objectives FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own objectives"
  ON public.sales_objectives FOR SELECT TO authenticated
  USING (auth.uid() = user_id);