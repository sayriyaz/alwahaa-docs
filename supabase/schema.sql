create extension if not exists "pgcrypto";

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_no text not null unique,
  client_id uuid not null references public.clients (id) on delete restrict,
  beneficiary_name text,
  date date not null default current_date,
  assigned_to text,
  processing_fee numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'Active',
  notes text
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null default 0
);

create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists service_orders_invoice_id_idx on public.service_orders (invoice_id);

grant all on table public.invoices to anon, authenticated;
grant all on table public.service_orders to anon, authenticated;

alter table public.invoices enable row level security;
alter table public.service_orders enable row level security;

drop policy if exists "Allow full access to invoices" on public.invoices;
create policy "Allow full access to invoices"
on public.invoices
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow full access to service orders" on public.service_orders;
create policy "Allow full access to service orders"
on public.service_orders
for all
to anon, authenticated
using (true)
with check (true);
