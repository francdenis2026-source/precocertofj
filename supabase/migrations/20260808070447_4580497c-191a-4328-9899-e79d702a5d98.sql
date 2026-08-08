-- 1. Create app_role enum if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- 2. Create user_roles table
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- 3. Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 4. Audit Log table for monitoring actions
create table if not exists public.monitoring_audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

grant insert, select on public.monitoring_audit_logs to authenticated;
grant all on public.monitoring_audit_logs to service_role;

alter table public.monitoring_audit_logs enable row level security;

create policy "Admins can view all audit logs"
on public.monitoring_audit_logs
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated users can insert audit logs"
on public.monitoring_audit_logs
for insert
to authenticated
with check (auth.uid() = user_id);
