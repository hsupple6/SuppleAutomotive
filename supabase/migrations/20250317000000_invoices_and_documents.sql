-- Submitted service invoices (PDF URL in storage) visible to customer
create table if not exists public.service_invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  invoice_number text not null,
  pdf_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_invoices_customer_id on public.service_invoices(customer_id);
create index if not exists idx_service_invoices_service_id on public.service_invoices(service_id);

comment on table public.service_invoices is 'Invoice PDFs submitted to customer from Supple Controls';

-- Generic customer documents (future uploads from admin)
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  pdf_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_documents_customer_id on public.customer_documents(customer_id);

comment on table public.customer_documents is 'PDF documents shared with customer (non-invoice)';
