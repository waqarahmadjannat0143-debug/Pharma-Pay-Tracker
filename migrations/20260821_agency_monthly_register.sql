-- Additive migration: preserves all existing stores, invoices, payments and allocations.
create table if not exists public.agencies (
  id serial primary key,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agencies_normalized_name_unique
  on public.agencies (normalized_name);

alter table public.invoices
  add column if not exists agency_id integer references public.agencies(id) on delete restrict;

alter table public.payments
  add column if not exists slip_number text;

create index if not exists invoices_customer_agency_date_idx
  on public.invoices (customer_id, agency_id, invoice_date);

alter table public.agencies enable row level security;
