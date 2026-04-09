create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('admin', 'accountant', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'accountant', 'editor', 'viewer'));

revoke all on table public.app_users from anon;
grant select, insert, update, delete on table public.app_users to authenticated;

alter table public.app_users enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.app_users
  where id = auth.uid()
  limit 1
$$;

create or replace function public.can_read_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant', 'editor', 'viewer')
$$;

create or replace function public.can_manage_clients()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant')
$$;

create or replace function public.can_create_invoices()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant')
$$;

create or replace function public.can_update_invoices()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant', 'editor')
$$;

create or replace function public.enforce_invoice_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() = 'editor' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.invoice_no is distinct from old.invoice_no
      or new.client_id is distinct from old.client_id
      or new.beneficiary_name is distinct from old.beneficiary_name
      or new.date is distinct from old.date
      or new.assigned_to is distinct from old.assigned_to
      or new.processing_fee is distinct from old.processing_fee
      or new.vat_amount is distinct from old.vat_amount
      or new.total_amount is distinct from old.total_amount
      or new.notes is distinct from old.notes then
      raise exception 'Editors can only update invoice status.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.can_manage_service_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant', 'editor')
$$;

create or replace function public.can_manage_tasks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant', 'editor')
$$;

create or replace function public.can_manage_receipts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'accountant')
$$;

create or replace function public.can_delete_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_read_ops() to authenticated;
grant execute on function public.can_manage_clients() to authenticated;
grant execute on function public.can_create_invoices() to authenticated;
grant execute on function public.can_update_invoices() to authenticated;
grant execute on function public.enforce_invoice_update_scope() to authenticated;
grant execute on function public.can_manage_service_orders() to authenticated;
grant execute on function public.can_manage_tasks() to authenticated;
grant execute on function public.can_manage_receipts() to authenticated;
grant execute on function public.can_delete_ops() to authenticated;

drop policy if exists "Users can view their own app user" on public.app_users;
create policy "Users can view their own app user"
on public.app_users
for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() = 'admin'
);

drop policy if exists "Admins can manage app users" on public.app_users;
create policy "Admins can manage app users"
on public.app_users
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

do $$
begin
  if to_regclass('public.clients') is not null then
    execute 'revoke all on table public.clients from anon';
    execute 'grant select, insert, update, delete on table public.clients to authenticated';
    execute 'alter table public.clients enable row level security';
    execute 'drop policy if exists "Authenticated users can view clients" on public.clients';
    execute 'drop policy if exists "Editors can manage clients" on public.clients';
    execute 'drop policy if exists "Authorized users can create clients" on public.clients';
    execute 'drop policy if exists "Authorized users can update clients" on public.clients';
    execute 'drop policy if exists "Admins can delete clients" on public.clients';
    execute 'create policy "Authenticated users can view clients" on public.clients for select to authenticated using (public.can_read_ops())';
    execute 'create policy "Authorized users can create clients" on public.clients for insert to authenticated with check (public.can_manage_clients())';
    execute 'create policy "Authorized users can update clients" on public.clients for update to authenticated using (public.can_manage_clients()) with check (public.can_manage_clients())';
    execute 'create policy "Admins can delete clients" on public.clients for delete to authenticated using (public.can_delete_ops())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.invoices') is not null then
    execute 'revoke all on table public.invoices from anon';
    execute 'grant select, insert, update, delete on table public.invoices to authenticated';
    execute 'alter table public.invoices enable row level security';
    execute 'drop trigger if exists enforce_invoice_update_scope on public.invoices';
    execute 'drop policy if exists "Allow full access to invoices" on public.invoices';
    execute 'drop policy if exists "Authenticated users can view invoices" on public.invoices';
    execute 'drop policy if exists "Editors can manage invoices" on public.invoices';
    execute 'drop policy if exists "Authorized users can create invoices" on public.invoices';
    execute 'drop policy if exists "Authorized users can update invoices" on public.invoices';
    execute 'drop policy if exists "Admins can delete invoices" on public.invoices';
    execute 'create policy "Authenticated users can view invoices" on public.invoices for select to authenticated using (public.can_read_ops())';
    execute 'create policy "Authorized users can create invoices" on public.invoices for insert to authenticated with check (public.can_create_invoices())';
    execute 'create policy "Authorized users can update invoices" on public.invoices for update to authenticated using (public.can_update_invoices()) with check (public.can_update_invoices())';
    execute 'create policy "Admins can delete invoices" on public.invoices for delete to authenticated using (public.can_delete_ops())';
    execute 'create trigger enforce_invoice_update_scope before update on public.invoices for each row execute function public.enforce_invoice_update_scope()';
  end if;
end $$;

do $$
begin
  if to_regclass('public.service_orders') is not null then
    execute 'revoke all on table public.service_orders from anon';
    execute 'grant select, insert, update, delete on table public.service_orders to authenticated';
    execute 'alter table public.service_orders enable row level security';
    execute 'drop policy if exists "Allow full access to service orders" on public.service_orders';
    execute 'drop policy if exists "Authenticated users can view service orders" on public.service_orders';
    execute 'drop policy if exists "Editors can manage service orders" on public.service_orders';
    execute 'drop policy if exists "Authorized users can create service orders" on public.service_orders';
    execute 'drop policy if exists "Authorized users can update service orders" on public.service_orders';
    execute 'drop policy if exists "Admins can delete service orders" on public.service_orders';
    execute 'create policy "Authenticated users can view service orders" on public.service_orders for select to authenticated using (public.can_read_ops())';
    execute 'create policy "Authorized users can create service orders" on public.service_orders for insert to authenticated with check (public.can_manage_service_orders())';
    execute 'create policy "Authorized users can update service orders" on public.service_orders for update to authenticated using (public.can_manage_service_orders()) with check (public.can_manage_service_orders())';
    execute 'create policy "Admins can delete service orders" on public.service_orders for delete to authenticated using (public.can_delete_ops())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.invoice_tasks') is not null then
    execute 'revoke all on table public.invoice_tasks from anon';
    execute 'grant select, insert, update, delete on table public.invoice_tasks to authenticated';
    execute 'alter table public.invoice_tasks enable row level security';
    execute 'drop policy if exists "Authenticated users can view invoice tasks" on public.invoice_tasks';
    execute 'drop policy if exists "Editors can manage invoice tasks" on public.invoice_tasks';
    execute 'drop policy if exists "Authorized users can create invoice tasks" on public.invoice_tasks';
    execute 'drop policy if exists "Authorized users can update invoice tasks" on public.invoice_tasks';
    execute 'drop policy if exists "Admins can delete invoice tasks" on public.invoice_tasks';
    execute 'create policy "Authenticated users can view invoice tasks" on public.invoice_tasks for select to authenticated using (public.can_read_ops())';
    execute 'create policy "Authorized users can create invoice tasks" on public.invoice_tasks for insert to authenticated with check (public.can_manage_tasks())';
    execute 'create policy "Authorized users can update invoice tasks" on public.invoice_tasks for update to authenticated using (public.can_manage_tasks()) with check (public.can_manage_tasks())';
    execute 'create policy "Admins can delete invoice tasks" on public.invoice_tasks for delete to authenticated using (public.can_delete_ops())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.invoice_receipts') is not null then
    execute 'revoke all on table public.invoice_receipts from anon';
    execute 'grant select, insert, update, delete on table public.invoice_receipts to authenticated';
    execute 'alter table public.invoice_receipts enable row level security';
    execute 'drop policy if exists "Authenticated users can view invoice receipts" on public.invoice_receipts';
    execute 'drop policy if exists "Editors can manage invoice receipts" on public.invoice_receipts';
    execute 'drop policy if exists "Authorized users can create invoice receipts" on public.invoice_receipts';
    execute 'drop policy if exists "Authorized users can update invoice receipts" on public.invoice_receipts';
    execute 'drop policy if exists "Admins can delete invoice receipts" on public.invoice_receipts';
    execute 'create policy "Authenticated users can view invoice receipts" on public.invoice_receipts for select to authenticated using (public.can_read_ops())';
    execute 'create policy "Authorized users can create invoice receipts" on public.invoice_receipts for insert to authenticated with check (public.can_manage_receipts())';
    execute 'create policy "Authorized users can update invoice receipts" on public.invoice_receipts for update to authenticated using (public.can_manage_receipts()) with check (public.can_manage_receipts())';
    execute 'create policy "Admins can delete invoice receipts" on public.invoice_receipts for delete to authenticated using (public.can_delete_ops())';
  end if;
end $$;

-- After creating users in Supabase Authentication, add one app_users row per person:
-- insert into public.app_users (id, email, full_name, role)
-- values ('<auth-user-id>', 'user@example.com', 'User Name', 'admin');
