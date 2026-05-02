-- Aggiunge il campo supplier_id alle misurazioni
-- Usato per distinguere Nurith vs Madrugada (entrambi fornitori PVC)
-- per finestre e porte-finestra con materiale PVC o alluminio.
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS supplier_id TEXT NULL;
