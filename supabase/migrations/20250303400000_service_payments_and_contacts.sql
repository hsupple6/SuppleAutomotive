-- Service payments (Cash, Credit, etc.) — balance = service total minus sum(payments); when 0, set paid
create table if not exists public.service_payments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'credit', 'check', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_payments_service_id on public.service_payments(service_id);
comment on table public.service_payments is 'Payments applied to a service; balance = total - sum(payments)';

-- Optional extra emails/phones per customer
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('email', 'phone')),
  value text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_contacts_customer_id on public.customer_contacts(customer_id);
comment on table public.customer_contacts is 'Additional email or phone for a customer';

-- RLS
alter table public.service_payments enable row level security;
alter table public.customer_contacts enable row level security;

create policy "service_role_all_service_payments"
  on public.service_payments for all to service_role using (true) with check (true);

create policy "service_role_all_customer_contacts"
  on public.customer_contacts for all to service_role using (true) with check (true);
