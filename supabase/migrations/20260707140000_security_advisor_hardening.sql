-- Security Advisor hardening (2026-07-07)
-- All changes are idempotent and non-breaking:
--   * pins search_path on flagged functions (config only, bodies untouched)
--   * revokes direct EXECUTE on trigger-only SECURITY DEFINER functions
--   * restricts anonymous access to measurement-photos objects
-- NOTE: public.has_role is intentionally left executable — it is called inside
-- many RLS policies and must stay callable by `authenticated`. Its advisor
-- warning ("Signed-In Users Can Execute SECURITY DEFINER Function") is expected.

-- 1) Pin search_path = public on every overload of the flagged functions.
--    Uses regprocedure so unknown/overloaded signatures are handled automatically.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'handle_new_user','has_role','generate_client_code','get_vat_report',
        'gen_payment_code','set_measurement_payment_code','set_measurement_client_id',
        'log_measurement_initial_status','log_measurement_status_change',
        'update_updated_at_column'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- 2) Revoke direct EXECUTE on trigger-only SECURITY DEFINER functions.
--    Triggers still fire (they run in the table owner's context), so this is safe.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'handle_new_user',
        'log_measurement_initial_status',
        'log_measurement_status_change'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, public', r.sig);
  END LOOP;
END $$;

-- 3) Restrict measurement-photos listing to authenticated users.
--    The bucket stays public, so getPublicUrl() CDN links keep working; this only
--    removes anonymous access via the authenticated storage API (blocks anon
--    enumeration). Making the bucket fully private requires app code changes and
--    is handled separately.
DROP POLICY IF EXISTS "Anyone can view measurement photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view measurement photos" ON storage.objects;
CREATE POLICY "Authenticated can view measurement photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'measurement-photos');
