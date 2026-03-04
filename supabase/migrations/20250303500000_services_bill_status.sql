-- Pending = visible to customer but NOT included in balance. Posted = visible and included in balance.
alter table public.services
  add column if not exists bill_status text not null default 'posted'
  check (bill_status in ('pending', 'posted'));

comment on column public.services.bill_status is 'pending: visible to customer, not in balance; posted: visible and counts toward balance';
