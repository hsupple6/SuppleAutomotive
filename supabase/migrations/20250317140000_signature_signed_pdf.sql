alter table public.customer_signature_bundles
  add column if not exists signed_pdf_url text;

comment on column public.customer_signature_bundles.signed_pdf_url is 'Final PDF including signature page after customer completes e-sign';
