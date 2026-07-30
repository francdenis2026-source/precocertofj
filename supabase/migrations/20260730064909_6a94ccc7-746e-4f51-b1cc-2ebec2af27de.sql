ALTER TABLE public.category_icon_overrides
  ADD COLUMN IF NOT EXISTS label text;

ALTER TABLE public.category_icon_overrides
  ALTER COLUMN kind DROP NOT NULL,
  ALTER COLUMN value DROP NOT NULL;

ALTER TABLE public.category_icon_overrides
  DROP CONSTRAINT IF EXISTS category_icon_overrides_kind_check;

ALTER TABLE public.category_icon_overrides
  ADD CONSTRAINT category_icon_overrides_kind_check
  CHECK (kind IS NULL OR kind = ANY (ARRAY['lucide'::text, 'url'::text]));

-- Ícone só é válido quando kind e value andam juntos; rótulo é limitado a 40 chars.
ALTER TABLE public.category_icon_overrides
  ADD CONSTRAINT category_icon_overrides_icon_pair_check
  CHECK ((kind IS NULL AND value IS NULL) OR (kind IS NOT NULL AND value IS NOT NULL));

ALTER TABLE public.category_icon_overrides
  ADD CONSTRAINT category_icon_overrides_label_check
  CHECK (label IS NULL OR (btrim(label) <> '' AND char_length(label) <= 40));