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

drop trigger if exists enforce_invoice_update_scope on public.invoices;

create trigger enforce_invoice_update_scope
before update on public.invoices
for each row
execute function public.enforce_invoice_update_scope();
