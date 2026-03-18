alter table public.customer_signature_bundles
  add column if not exists release_fields jsonb not null default '{}';

comment on column public.customer_signature_bundles.release_fields is 'Admin-filled agreement values (labor rate, fees, etc.) at release time';
