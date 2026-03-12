-- Seed more fake reviews for Supple Automotive (run after 20250305100000_reviews)

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Chris W.', 'Best shop in the area. They got my AC working in one day. Fair price and no runaround.', 5, now() - interval '3 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Jennifer L.', 'Needed a pre-purchase inspection. They were thorough and gave me a clear report. Saved me from a bad buy.', 5, now() - interval '4 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Marcus D.', 'Transmission service was done right. Car shifts smooth now. Will be back for oil changes.', 5, now() - interval '6 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Amanda S.', 'Fixed my check engine light and explained what was wrong in plain English. Very professional.', 5, now() - interval '8 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Tom R.', 'Dropped off my truck for brake pads. Done when they said, price was exactly what they quoted. No surprises.', 5, now() - interval '9 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Nina P.', 'First time here. They squeezed me in for a flat tire repair. Quick and friendly. Definitely coming back.', 5, now() - interval '11 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Kevin H.', 'Had them do a full service on my sedan. Everything was itemized and they didn''t push extra work. Honest shop.', 5, now() - interval '12 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Rachel F.', 'My daughter''s car had a weird smell. They found the issue (leaking hose) and fixed it same day. So grateful.', 5, now() - interval '13 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Omar G.', 'Battery died on a Sunday. They were able to get me in Monday morning. Fair price and no hassle.', 4, now() - interval '15 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Stephanie B.', 'From my daily beater to my weekend toy—they handle both. Knowledgeable and they don''t overcharge.', 5, now() - interval '16 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Derek M.', 'Suspension work was done right. Car drives like new. They even pointed out a small thing they fixed for free.', 5, now() - interval '18 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Yuki T.', 'Needed an oil change and tire rotation. In and out in under an hour. Clean waiting area and good communication.', 5, now() - interval '19 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Brandon C.', 'Third time here. Every visit has been solid. They remember my car and what they did last time. That matters.', 5, now() - interval '20 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Maria V.', 'I was nervous about repair costs. They gave me a written estimate and stuck to it. No hidden fees.', 5, now() - interval '22 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Jake N.', 'Coolant leak fixed in a day. They had the part in stock. Car runs cool now. Happy customer.', 5, now() - interval '24 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Elena K.', 'Brought in my SUV for brakes and an inspection. Everything was clear and on time. Will recommend to friends.', 5, now() - interval '25 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Phil J.', 'Honest diagnosis. They told me what I needed and what could wait. No pressure. That''s rare.', 5, now() - interval '27 days'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Sandra O.', 'My car failed smog. They found the issue, fixed it, and I passed on the retest. One stop and done.', 4, now() - interval '1 month'
from public.accounts a where a.slug = 'supple-automotive' limit 1;

insert into public.reviews (account_id, name, body, rating, created_at)
select a.id, 'Alex Z.', 'From commuters to hypercars—they really can fix it. Had my daily and my project car both in. Top notch team.', 5, now() - interval '1 month'
from public.accounts a where a.slug = 'supple-automotive' limit 1;
