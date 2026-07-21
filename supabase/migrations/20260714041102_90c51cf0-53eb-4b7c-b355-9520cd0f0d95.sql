
CREATE POLICY "report-evidence users upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "report-evidence users read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-evidence'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "report-evidence users delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
