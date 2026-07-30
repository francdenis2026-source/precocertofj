ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS duration_ms integer;

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fn_created ON public.ai_usage (function_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_ai_usage_overview(_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(hours => greatest(1, least(coalesce(_hours, 24), 24 * 90)));
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'sinceHours', greatest(1, least(coalesce(_hours, 24), 24 * 90)),
    'totals', (
      SELECT jsonb_build_object(
        'calls', count(*),
        'failures', count(*) FILTER (WHERE success IS FALSE),
        'users', count(DISTINCT user_id),
        'tokens', coalesce(sum(total_tokens), 0),
        'creditsCents', coalesce(sum(credits_cents), 0),
        'avgDurationMs', coalesce(round(avg(duration_ms)), 0),
        'p95DurationMs', coalesce(
          percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)
      )
      FROM public.ai_usage WHERE created_at >= _since
    ),
    'byFunction', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'calls')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'functionName', function_name,
          'calls', count(*),
          'failures', count(*) FILTER (WHERE success IS FALSE),
          'tokens', coalesce(sum(total_tokens), 0),
          'creditsCents', coalesce(sum(credits_cents), 0),
          'avgDurationMs', coalesce(round(avg(duration_ms)), 0)
        ) AS x
        FROM public.ai_usage WHERE created_at >= _since
        GROUP BY function_name
      ) s
    ), '[]'::jsonb),
    'topUsers', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'calls')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'userId', u.user_id,
          'email', p.email,
          'calls', count(*),
          'failures', count(*) FILTER (WHERE u.success IS FALSE),
          'tokens', coalesce(sum(u.total_tokens), 0),
          'creditsCents', coalesce(sum(u.credits_cents), 0)
        ) AS x
        FROM public.ai_usage u
        LEFT JOIN public.profiles p ON p.id = u.user_id
        WHERE u.created_at >= _since
        GROUP BY u.user_id, p.email
        ORDER BY count(*) DESC
        LIMIT 10
      ) s
    ), '[]'::jsonb),
    'series', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'bucket')
      FROM (
        SELECT jsonb_build_object(
          'bucket', to_char(date_trunc('hour', created_at), 'YYYY-MM-DD"T"HH24:00'),
          'calls', count(*),
          'failures', count(*) FILTER (WHERE success IS FALSE),
          'creditsCents', coalesce(sum(credits_cents), 0)
        ) AS x
        FROM public.ai_usage WHERE created_at >= _since
        GROUP BY date_trunc('hour', created_at)
      ) s
    ), '[]'::jsonb),
    'recentFailures', coalesce((
      SELECT jsonb_agg(x)
      FROM (
        SELECT jsonb_build_object(
          'id', id,
          'functionName', function_name,
          'errorMessage', error_message,
          'createdAt', created_at
        ) AS x
        FROM public.ai_usage
        WHERE created_at >= _since AND success IS FALSE
        ORDER BY created_at DESC
        LIMIT 20
      ) s
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_overview(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_overview(integer) TO authenticated;