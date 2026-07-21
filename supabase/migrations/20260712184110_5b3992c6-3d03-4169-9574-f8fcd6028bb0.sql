CREATE POLICY "Anyone can upload scan images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'scans');

CREATE POLICY "Anyone can read scan images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'scans');

CREATE POLICY "Owners delete their scan images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'scans' AND owner = auth.uid());