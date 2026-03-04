-- Add payment_status to services for balance / Pay Now
alter table public.services
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid'));

comment on column public.services.payment_status is 'unpaid | partial | paid';

-- Allow services without a vehicle (e.g. from request-service before vehicle known)
alter table public.services alter column vehicle_id drop not null;
