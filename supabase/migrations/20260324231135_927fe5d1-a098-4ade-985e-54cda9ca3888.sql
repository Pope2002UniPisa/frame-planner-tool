ALTER TABLE public.measurements ADD COLUMN order_group_id uuid DEFAULT NULL;
ALTER TABLE public.measurements ADD COLUMN order_item_index integer DEFAULT NULL;
ALTER TABLE public.measurements ADD COLUMN order_total_items integer DEFAULT NULL;