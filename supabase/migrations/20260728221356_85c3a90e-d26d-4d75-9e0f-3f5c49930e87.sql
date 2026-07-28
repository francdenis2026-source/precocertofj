-- Bloqueia inserção anônima em scans (apenas usuários autenticados podem enviar capturas)
DROP POLICY IF EXISTS "Anon insert public scans" ON public.scans;

-- Remove a política pública de SELECT em shared_comparisons.
-- A rota /c/:id lê via server function usando service role (getSharedComparison),
-- então a leitura por link continua funcionando; apenas a enumeração é bloqueada.
DROP POLICY IF EXISTS "Anyone can view non-expired shares" ON public.shared_comparisons;

-- Revoga o grant anon padrão (defensivo): shared_comparisons não deve ser lida pelo cliente anônimo.
REVOKE SELECT ON public.shared_comparisons FROM anon;