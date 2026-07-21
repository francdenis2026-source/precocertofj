
ALTER TABLE public.collaborator_submissions
  ADD COLUMN IF NOT EXISTS attachment_paths text[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "collab_receipts_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "collab_receipts_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "collab_receipts_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "collab_receipts_admin_read" ON storage.objects;

CREATE POLICY "collab_receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'collab-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "collab_receipts_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'collab-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "collab_receipts_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'collab-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "collab_receipts_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'collab-receipts'
    AND public.has_role(auth.uid(), 'admin')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications';
  END IF;
END $$;

ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
