-- Optional shop cost on parts (used for receipt tracker / margin reporting)
alter table public.service_parts
  add column if not exists unit_cost numeric(12, 2);

comment on column public.service_parts.unit_cost is 'Shop cost per unit (optional); customer price remains unit_price';
