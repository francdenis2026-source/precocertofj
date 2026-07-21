
-- logos bucket policies
CREATE POLICY "Admins upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- scans bucket admin access
CREATE POLICY "Admins upload scans"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scans' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read scans"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'scans' AND public.has_role(auth.uid(), 'admin'));
