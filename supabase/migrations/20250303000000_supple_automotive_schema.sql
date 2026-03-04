-- Supple Automotive — full schema: accounts, customers, vehicles, services, service_parts
-- Run in Supabase SQL Editor or via: supabase db push

-- ========== ACCOUNTS (shop/business) ==========
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  website text,
  logo_url text,
  timezone text default 'America/Los_Angeles',
  currency text default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts is 'Shop/business accounts (e.g. Supple Automotive)';

-- ========== CUSTOMERS (main customer data; contact details live here) ==========
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_account_id on public.customers(account_id);
create index if not exists idx_customers_email on public.customers(email);
create index if not exists idx_customers_phone on public.customers(phone);

comment on table public.customers is 'Customer contact and address; referenced by services';

-- ========== VEHICLES (year, make, model; belong to a customer) ==========
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  year smallint not null,
  make text not null,
  model text not null,
  trim text,
  vin text,
  license_plate text,
  mileage integer,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_account_id on public.vehicles(account_id);
create index if not exists idx_vehicles_customer_id on public.vehicles(customer_id);
create index if not exists idx_vehicles_vin on public.vehicles(vin);

comment on table public.vehicles is 'Customer vehicles; year, make, model and VIN';

-- ========== SERVICES (work orders / jobs) ==========
create type public.service_status as enum (
  'draft',
  'scheduled',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled'
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  status public.service_status not null default 'draft',
  reference_number text,
  service_name text not null,
  service_price numeric(12, 2) not null default 0,
  service_time_minutes integer,
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_account_id on public.services(account_id);
create index if not exists idx_services_customer_id on public.services(customer_id);
create index if not exists idx_services_vehicle_id on public.services(vehicle_id);
create index if not exists idx_services_status on public.services(status);
create index if not exists idx_services_reference_number on public.services(reference_number);
create index if not exists idx_services_scheduled_at on public.services(scheduled_at);

comment on table public.services is 'Work orders; link customer + vehicle, service name/price/time and parts';

-- ========== SERVICE_PARTS (parts on a service) ==========
create table if not exists public.service_parts (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  part_name text not null,
  part_number text,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) generated always as (quantity * unit_price) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_parts_service_id on public.service_parts(service_id);

comment on table public.service_parts is 'Parts used on a service; name, number, quantity, price';

-- ========== UPDATED_AT TRIGGERS ==========
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create trigger service_parts_updated_at
  before update on public.service_parts
  for each row execute function public.set_updated_at();

-- ========== ROW LEVEL SECURITY (RLS) ==========
-- RLS enabled with no policies: only Supabase service_role (backend) can access.
-- Use the service key in server.js / API; do not expose it to the client.
alter table public.accounts enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.services enable row level security;
alter table public.service_parts enable row level security;

-- ========== SEED: one account for Supple Automotive ==========
insert into public.accounts (
  name,
  slug,
  email,
  phone,
  address_line1,
  city,
  state,
  postal_code
) values (
  'Supple Automotive',
  'supple-automotive',
  null,
  null,
  null,
  null,
  null,
  null
) on conflict (slug) do nothing;
