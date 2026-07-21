DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read logos bucket'
  ) THEN
    CREATE POLICY "Public read logos bucket"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'logos');
  END IF;
END $$;