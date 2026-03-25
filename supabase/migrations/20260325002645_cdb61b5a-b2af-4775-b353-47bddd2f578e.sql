ALTER TABLE public.measurements
  ADD COLUMN IF NOT EXISTS estimated_delivery_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_notes text DEFAULT NULL;