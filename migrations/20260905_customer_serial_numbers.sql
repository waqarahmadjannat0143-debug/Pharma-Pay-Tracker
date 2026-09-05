begin;

alter table public.customers
  add column if not exists serial_number integer,
  add column if not exists register_number integer;

with ranked as (
  select id, row_number() over (partition by organization_id order by id)::integer as position
  from public.customers
)
update public.customers c
set serial_number = coalesce(c.serial_number, ranked.position),
    register_number = coalesce(c.register_number, ranked.position)
from ranked
where ranked.id = c.id
  and (c.serial_number is null or c.register_number is null);

alter table public.customers
  alter column serial_number set not null,
  alter column register_number set not null;

alter table public.customers
  drop constraint if exists customers_serial_number_positive,
  add constraint customers_serial_number_positive check (serial_number > 0),
  drop constraint if exists customers_register_number_positive,
  add constraint customers_register_number_positive check (register_number > 0);

create unique index if not exists customers_organization_serial_number_uq
  on public.customers (organization_id, serial_number);
create unique index if not exists customers_organization_register_number_uq
  on public.customers (organization_id, register_number);

create schema if not exists private;
create or replace function private.assign_customer_serial_numbers()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.serial_number is null then
    select coalesce(max(c.serial_number), 0) + 1 into new.serial_number
    from public.customers c where c.organization_id = new.organization_id;
  end if;
  if new.register_number is null then
    select coalesce(max(c.register_number), 0) + 1 into new.register_number
    from public.customers c where c.organization_id = new.organization_id;
  end if;
  return new;
end;
$$;
revoke all on function private.assign_customer_serial_numbers() from public, anon, authenticated;

drop trigger if exists customers_assign_serial_numbers on public.customers;
create trigger customers_assign_serial_numbers
before insert on public.customers
for each row execute function private.assign_customer_serial_numbers();

commit;
