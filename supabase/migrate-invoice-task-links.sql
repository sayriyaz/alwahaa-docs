alter table if exists public.invoice_tasks
add column if not exists service_order_id uuid references public.service_orders(id) on delete set null;

create index if not exists invoice_tasks_service_order_id_idx
on public.invoice_tasks (service_order_id);

create unique index if not exists invoice_tasks_service_order_id_unique
on public.invoice_tasks (service_order_id)
where service_order_id is not null;
