
-- Restrict storage.objects writes on email-assets to service_role only
DROP POLICY IF EXISTS "email_assets_service_insert" ON storage.objects;
DROP POLICY IF EXISTS "email_assets_service_update" ON storage.objects;
DROP POLICY IF EXISTS "email_assets_service_delete" ON storage.objects;

CREATE POLICY "email_assets_service_insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "email_assets_service_update" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'email-assets' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "email_assets_service_delete" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'email-assets' AND auth.role() = 'service_role');
