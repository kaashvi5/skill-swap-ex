DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Proof public read" ON storage.objects;
DROP POLICY IF EXISTS "Cert public read" ON storage.objects;
CREATE POLICY "Owners list own files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','skill-proofs','certificates') AND (auth.uid())::text = (storage.foldername(name))[1]);