
UPDATE public.product_catalog
SET image_url = NULL,
    image_search_found = NULL,
    image_search_attempted_at = NULL
WHERE id IN (
  '5ce0c745-42c5-4381-aaba-bf1130f19229',
  'bf5b2568-e14f-49ae-8546-dc4b88c1745a',
  '6866ab6e-3345-43da-ad5b-c42255e30042',
  'ac9bdefb-c4c0-4788-9bb8-c6070cf8c78f'
);
