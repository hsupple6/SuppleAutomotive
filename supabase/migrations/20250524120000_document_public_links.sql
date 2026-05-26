-- Shareable estimate (sign) / invoice (view) links from document builders
create table if not exists public.document_public_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token text not null unique,
  document_type text not null check (document_type in ('estimate', 'invoice')),
  status text not null check (status in ('pending_signature', 'signed', 'released')),
  customer_name text not null,
  customer_email text,
  payload jsonb not null default '{}',
  unsigned_pdf_url text not null,
  signed_pdf_url text,
  signature_mode text,
  signature_payload text,
  signed_at timestamptz,
  signer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_public_links_token on public.document_public_links(token);
create index if not exists idx_document_public_links_account on public.document_public_links(account_id, created_at desc);

comment on table public.document_public_links is 'Public token links for estimate e-sign and released invoice PDF viewing';

alter table public.document_public_links enable row level security;

create policy "service_role_all_document_public_links"
  on public.document_public_links for all
  to service_role
  using (true)
  with check (true);

create trigger document_public_links_updated_at
  before update on public.document_public_links
  for each row execute function public.set_updated_at();
