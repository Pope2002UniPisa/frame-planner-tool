
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_product_type_check;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_product_type_check CHECK (product_type = ANY (ARRAY['finestra'::text, 'porta_finestra'::text, 'porta'::text, 'basculante'::text, 'zanzariera'::text, 'persiana'::text]));

ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_frame_type_check;

ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_handle_type_check;

ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_glass_type_check;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_glass_type_check CHECK (glass_type = ANY (ARRAY['doppio'::text, 'triplo'::text, 'basso_emissivo'::text, 'antisfondamento'::text, 'satinato'::text, 'selettivo'::text, 'cieca'::text, 'trasparente'::text, 'a_quadri'::text, 'stondato'::text]));
