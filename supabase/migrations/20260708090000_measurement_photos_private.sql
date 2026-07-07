-- Rende privato il bucket measurement-photos (foto clienti).
-- ATTENZIONE ORDINE DI ROLLOUT: applicare SOLO dopo che il codice che usa i
-- signed URL (componente SignedImage / lib photoUrls) è live in produzione,
-- altrimenti il sito con codice vecchio (getPublicUrl) mostrerebbe foto rotte.
--
-- Reversibile: per tornare indietro basta rimettere public = true.
-- La policy SELECT "Authenticated can view measurement photos" (migration
-- 20260707140000) resta e permette agli utenti autenticati di generare i
-- signed URL. Upload/insert invariati.

UPDATE storage.buckets SET public = false WHERE id = 'measurement-photos';
