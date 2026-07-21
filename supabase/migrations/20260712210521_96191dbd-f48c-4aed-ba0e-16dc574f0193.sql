-- Tighten anon access on shared_comparisons: hide user_id and updated_at from public
REVOKE SELECT ON public.shared_comparisons FROM anon;
GRANT SELECT (id, image_url, market_name, products, expires_at, created_at)
  ON public.shared_comparisons TO anon;