-- E-signature packets released from admin (e.g. blank-docs/Starter)
create table if not exists public.customer_signature_bundles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  bundle_key text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'dismissed')),
  signature_mode text,
  signature_payload text,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sig_bundles_customer_pending
  on public.customer_signature_bundles (customer_id)
  where status = 'pending';

create table if not exists public.customer_signature_bundle_docs (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.customer_signature_bundles(id) on delete cascade,
  title text not null,
  pdf_url text not null,
  sort_order int not null default 0
);

create index if not exists idx_sig_bundle_docs_bundle on public.customer_signature_bundle_docs (bundle_id);

comment on table public.customer_signature_bundles is 'Customer must acknowledge/sign PDFs released from Supple Controls';
