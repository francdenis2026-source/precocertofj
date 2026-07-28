UPDATE public.license_plans SET ai_monthly_quota = 1  WHERE slug = 'degustacao';
UPDATE public.license_plans SET ai_monthly_quota = 30 WHERE slug = 'mensal';
UPDATE public.license_plans SET ai_monthly_quota = 40 WHERE slug = 'trimestral';
UPDATE public.license_plans SET ai_monthly_quota = 60 WHERE slug = 'anual';