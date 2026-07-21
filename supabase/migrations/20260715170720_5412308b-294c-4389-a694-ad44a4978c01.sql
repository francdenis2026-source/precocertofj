-- Corrige exposição pública de receipts e do bucket 'scans'
DROP POLICY IF EXISTS "Public can view receipts of active establishments" ON public.receipts;

DROP POLICY IF EXISTS "Anyone can read scan images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload scan images" ON storage.objects;

-- Leitura de scans: apenas o dono autenticado (owner) e admins (política já existe)
CREATE POLICY "Owners read their scan images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'scans' AND owner = auth.uid());

-- Upload de scans: apenas autenticados, marcados como owner deles
CREATE POLICY "Authenticated upload own scan images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scans' AND owner = auth.uid());