UPDATE public.establishments
   SET logo_url = '/logos/claudia-v7.webp', updated_at = now()
 WHERE name ILIKE 'COMERCIAL CL%UDIA';

UPDATE public.establishments
   SET brand_color = '#B02318', updated_at = now()
 WHERE name ILIKE 'CENTRAL SUPER';