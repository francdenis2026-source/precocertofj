-- Índice parcial para acelerar backfill de scans com market_name vazio
CREATE INDEX IF NOT EXISTS idx_scans_establishment_id_market_null
  ON public.scans (establishment_id)
  WHERE market_name IS NULL AND establishment_id IS NOT NULL;

-- Índice geral em establishment_id para joins/lookups do trigger e consultas
CREATE INDEX IF NOT EXISTS idx_scans_establishment_id
  ON public.scans (establishment_id);

-- Suporte a buscas por market_name (usado como fallback em várias telas)
CREATE INDEX IF NOT EXISTS idx_scans_market_name
  ON public.scans (market_name)
  WHERE market_name IS NOT NULL;

-- establishments.id já é PK (lookup do trigger é O(1)); indexar name para buscas admin
CREATE INDEX IF NOT EXISTS idx_establishments_name
  ON public.establishments (name);