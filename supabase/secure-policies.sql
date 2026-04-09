-- Secure RLS Policies for Alwahaa Ops
-- Run this after setting up your app_users table

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- ========================
-- Clients Table
-- ========================

alter table if exists public.clients enable row level security;

drop policy if exists "Allow authenticated users to read clients" on public.clients;
create policy "Allow authenticated users to read clients"
  on public.clients
  for select
  to authenticated
  using (true);

drop policy if exists "Allow editors and admins to create clients" on public.clients;
create policy "Allow editors and admins to create clients"
  on public.clients
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Allow editors and admins to update clients" on public.clients;
create policy "Allow editors and admins to update clients"
  on public.clients
  for update
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

-- ========================
-- Invoices Table
-- ========================

alter table if exists public.invoices enable row level security;

drop policy if exists "Allow authenticated users to read invoices" on public.invoices;
create policy "Allow authenticated users to read invoices"
  on public.invoices
  for select
  to authenticated
  using (true);

drop policy if exists "Allow editors and admins to create invoices" on public.invoices;
create policy "Allow editors and admins to create invoices"
  on public.invoices
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Allow editors and admins to update invoices" on public.invoices;
create policy "Allow editors and admins to update invoices"
  on public.invoices
  for update
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Allow admins to delete invoices" on public.invoices;
create policy "Allow admins to delete invoices"
  on public.invoices
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role = 'admin'
    )
  );

-- ========================
-- Service Orders Table
-- ========================

alter table if exists public.service_orders enable row level security;

drop policy if exists "Allow authenticated users to read service orders" on public.service_orders;
create policy "Allow authenticated users to read service orders"
  on public.service_orders
  for select
  to authenticated
  using (true);

drop policy if exists "Allow editors and admins to manage service orders" on public.service_orders;
create policy "Allow editors and admins to manage service orders"
  on public.service_orders
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

-- ========================
-- Invoice Tasks Table
-- ========================

alter table if exists public.invoice_tasks enable row level security;

drop policy if exists "Allow authenticated users to read invoice tasks" on public.invoice_tasks;
create policy "Allow authenticated users to read invoice tasks"
  on public.invoice_tasks
  for select
  to authenticated
  using (true);

drop policy if exists "Allow editors and admins to manage invoice tasks" on public.invoice_tasks;
create policy "Allow editors and admins to manage invoice tasks"
  on public.invoice_tasks
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

-- ========================
-- Invoice Receipts Table
-- ========================

alter table if exists public.invoice_receipts enable row level security;

drop policy if exists "Allow authenticated users to read receipts" on public.invoice_receipts;
create policy "Allow authenticated users to read receipts"
  on public.invoice_receipts
  for select
  to authenticated
  using (true);

drop policy if exists "Allow editors and admins to manage receipts" on public.invoice_receipts;
create policy "Allow editors and admins to manage receipts"
  on public.invoice_receipts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.app_users
      where app_users.id = auth.uid()
      and app_users.role in ('admin', 'editor')
    )
  );

-- ========================
-- App Users Table (Admin only access)
-- ========================

alter table if exists public.app_users enable row level security;

drop policy if exists "Allow users to read their own profile" on public.app_users;
create policy "Allow users to read their own profile"
  on public.app_users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Allow admins full access to app_users" on public.app_users;
create policy "Allow admins full access to app_users"
  on public.app_users
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_users as u
      where u.id = auth.uid()
      and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.app_users as u
      where u.id = auth.uid()
      and u.role = 'admin'
    )
  );

-- Grant permissions to anon for auth flows
grant select on public.app_users to anon;

-- Grant all to authenticated
grant all on table public.clients to authenticated;
grant all on table public.invoices to authenticated;
grant all on table public.service_orders to authenticated;
grant all on table public.invoice_tasks to authenticated;
grant all on table public.invoice_receipts to authenticated;
grant all on table public.app_users to authenticated;
