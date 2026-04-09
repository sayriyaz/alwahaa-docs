alter table if exists public.invoice_lines rename to service_orders;

drop index if exists public.invoice_lines_invoice_id_idx;
create index if not exists service_orders_invoice_id_idx on public.service_orders (invoice_id);

grant all on table public.service_orders to anon, authenticated;
alter table public.service_orders enable row level security;

drop policy if exists "Allow full access to invoice lines" on public.service_orders;
drop policy if exists "Allow full access to service orders" on public.service_orders;
create policy "Allow full access to service orders"
on public.service_orders
for all
to anon, authenticated
using (true)
with check (true);
