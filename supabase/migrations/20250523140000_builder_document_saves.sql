-- Saved estimate / invoice drafts from Supple Controls builders
create table if not exists public.builder_document_saves (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  document_type text not null check (document_type in ('estimate', 'invoice')),
  title text not null,
  customer_name text not null,
  payload jsonb not null,
  source_estimate_id uuid references public.builder_document_saves(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_builder_document_saves_account_type
  on public.builder_document_saves(account_id, document_type, updated_at desc);

comment on table public.builder_document_saves is 'Draft estimates and invoices from Supple Controls document builders';

alter table public.builder_document_saves enable row level security;

create policy "service_role_all_builder_document_saves"
  on public.builder_document_saves for all
  to service_role
  using (true)
  with check (true);

create trigger builder_document_saves_updated_at
  before update on public.builder_document_saves
  for each row execute function public.set_updated_at();
