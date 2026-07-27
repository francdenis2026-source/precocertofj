ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK (action = ANY (ARRAY[
  'price_update','price_create','scan_delete','price_verify','price_unverify',
  'cache_invalidate_global','cache_invalidate_product','cache_invalidate_store',
  'catalog_update','catalog_delete','establishment_update','establishment_delete',
  'user_invite','user_remove','role_grant','role_revoke','admin_access'
]));