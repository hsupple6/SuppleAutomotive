-- Service images attached to a service (for dev + customer views)
create table if not exists public.service_images (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  image_url text not null,
  caption text,
  taken_at timestamptz not null default now(),
  taken_at_local_label text,
  address_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_images_service_id on public.service_images(service_id);

comment on table public.service_images is 'Images attached to a service; stored in Supabase Storage or external URL';

