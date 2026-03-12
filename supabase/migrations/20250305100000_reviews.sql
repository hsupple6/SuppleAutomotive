-- Reviews: customer testimonials for the homepage slideshow
-- name, body (review text), rating (1-5), created_at

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  body text not null,
  rating smallint not null default 5 check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_account_id on public.reviews(account_id);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);

comment on table public.reviews is 'Customer reviews for homepage slideshow; anyone can submit via plus button';

alter table public.reviews enable row level security;
-- No policies: only backend (service_role) can read/write via server API.

-- Seed sample reviews (account_id from slug)
insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Sarah M.', 'They fixed my brakes same day. Honest quote, no upsells. Will definitely come back.', 5, now() - interval '2 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'James K.', 'Brought in my daily driver and my weekend car. From commuters to hypercars—they can fix it. Top notch.', 5, now() - interval '5 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Mike T.', 'Fair pricing and they explained everything. No pressure, just good work.', 5, now() - interval '1 week'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Lisa R.', 'Oil change and inspection were quick. Professional and friendly. Five stars.', 5, now() - interval '10 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Dave P.', 'Had a weird noise—they diagnosed it fast and fixed it for less than I expected. Highly recommend.', 4, now() - interval '2 weeks'
from public.accounts a where a.slug = 'supple-automotive' limit 1;
