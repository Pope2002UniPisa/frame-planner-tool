
ALTER TABLE public.measurements 
ADD COLUMN estimated_price numeric(10,2) DEFAULT NULL;

ALTER TABLE public.measurements 
ADD COLUMN payment_status text DEFAULT 'non_pagato';

ALTER TABLE public.measurements 
ADD COLUMN amount_paid numeric(10,2) DEFAULT 0;

ALTER TABLE public.measurements 
ADD COLUMN has_dispute boolean DEFAULT false;

ALTER TABLE public.measurements 
ADD COLUMN dispute_notes text DEFAULT NULL;

ALTER TABLE public.measurements 
ADD COLUMN has_modification boolean DEFAULT false;

ALTER TABLE public.measurements 
ADD COLUMN modification_notes text DEFAULT NULL;
