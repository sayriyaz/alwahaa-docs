alter table if exists public.invoice_tasks
add column if not exists task_date date;

update public.invoice_tasks
set task_date = created_at::date
where task_date is null;

create index if not exists invoice_tasks_task_date_idx
on public.invoice_tasks (task_date);
