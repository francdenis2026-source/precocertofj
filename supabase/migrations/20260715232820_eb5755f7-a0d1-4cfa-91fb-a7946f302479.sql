
-- Habilita unaccent (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.infer_size_from_name(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  n text := lower(unaccent(coalesce(p_name, '')));
  m text;
  num numeric;
  unit text;
BEGIN
  IF n = '' THEN RETURN NULL; END IF;

  -- 1) Formatos multipack (ex.: "Pack 4x36g", "cx 12x1L") → mantém o tamanho unitário
  m := (regexp_match(n, '\d+\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ml|l)\M'))[1]
       || (regexp_match(n, '\d+\s*x\s*\d+(?:[.,]\d+)?\s*(kg|g|mg|ml|l)\M'))[1];
  IF m IS NOT NULL AND m <> '' THEN
    num := replace((regexp_match(n, '\d+\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:kg|g|mg|ml|l)\M'))[1], ',', '.')::numeric;
    unit := (regexp_match(n, '\d+\s*x\s*\d+(?:[.,]\d+)?\s*(kg|g|mg|ml|l)\M'))[1];
  ELSE
    -- 2) Padrão principal: número + unidade métrica ou contável
    m := (regexp_match(n,
      '(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ml|l|litros?|gramas?|un|unid|unidades?|comprimidos?|caps?|capsulas?|drageas?|sachês?|sachets?|envelopes?|folhas?|rolos?|pastilhas?)\M'
    ))[1];
    IF m IS NOT NULL THEN
      num := replace(m, ',', '.')::numeric;
      unit := (regexp_match(n,
        '\d+(?:[.,]\d+)?\s*(kg|g|mg|ml|l|litros?|gramas?|un|unid|unidades?|comprimidos?|caps?|capsulas?|drageas?|sachês?|sachets?|envelopes?|folhas?|rolos?|pastilhas?)\M'
      ))[1];
    END IF;
  END IF;

  -- 3) Heurísticas por marca (padrão consolidado no varejo brasileiro)
  IF num IS NULL THEN
    IF n ~ 'sazon' THEN num := 60; unit := 'g';
    ELSIF n ~ 'aji[- ]?sal' OR n ~ 'aji[- ]?no[- ]?moto' THEN num := 60; unit := 'g';
    ELSIF n ~ 'club social' THEN num := 24; unit := 'g';
    ELSIF n ~ 'butter cracker' AND n ~ 'delic|dellio' THEN num := 200; unit := 'g';
    ELSIF n ~ 'oreo' AND n ~ 'oferta' THEN num := 90; unit := 'g';
    ELSIF n ~ 'richester animados' THEN num := 60; unit := 'g';
    ELSIF n ~ 'caldo' AND n ~ 'apti' THEN num := 57; unit := 'g';
    ELSIF n ~ 'wafer' THEN num := 90; unit := 'g';
    ELSIF n ~ 'ketchup' AND n ~ 'nero' THEN num := 380; unit := 'g';
    ELSIF n ~ 'maionese' AND n ~ 'heinz' THEN num := 390; unit := 'g';
    ELSIF n ~ 'maionese' AND n ~ 'hellman' AND n ~ 'sache' THEN num := 7; unit := 'g';
    ELSIF n ~ 'bicarbonato' THEN num := 100; unit := 'g';
    ELSIF n ~ 'tempero' AND (n ~ 'ami' OR n ~ 'sandella') THEN num := 60; unit := 'g';
    END IF;
  END IF;

  IF num IS NULL OR unit IS NULL THEN RETURN NULL; END IF;

  -- 4) Normalização
  unit := lower(unit);
  IF unit IN ('gramas','grama') THEN unit := 'g'; END IF;
  IF unit IN ('litros','litro') THEN unit := 'l'; END IF;
  IF unit IN ('unid','unidade','unidades') THEN unit := 'un'; END IF;
  IF unit IN ('capsulas','caps') THEN unit := 'cáps'; END IF;
  IF unit IN ('comprimido','comprimidos') THEN unit := 'comp'; END IF;

  -- 5) Compactação: 1000g → 1kg, 1000ml → 1L
  IF unit = 'g' AND num >= 1000 AND (num::int % 1000) = 0 THEN
    RETURN (num/1000)::text || 'kg';
  END IF;
  IF unit = 'ml' AND num >= 1000 AND (num::int % 1000) = 0 THEN
    RETURN (num/1000)::text || 'L';
  END IF;

  -- Formata: 1.0 → 1, 1.5 mantém
  IF num = trunc(num) THEN
    RETURN num::int::text || unit;
  ELSE
    RETURN trim(trailing '0' from num::text) || unit;
  END IF;
END;
$$;

-- Aplica a nova extração em todos os itens do catálogo
UPDATE public.product_catalog
SET default_unit = COALESCE(public.infer_size_from_name(display_name), default_unit)
WHERE lower(coalesce(default_unit,'')) IN ('','un','pack','pct','unidade','unid','kg','ml','g','l','un.','pct.')
  AND public.infer_size_from_name(display_name) IS NOT NULL;
