UPDATE public.establishments
SET logo_url = replace(replace(logo_url, '-v5.png', '-v6.webp'), '-v4.png', '-v6.webp')
WHERE logo_url LIKE '/logos/%-v5.png' OR logo_url LIKE '/logos/%-v4.png';