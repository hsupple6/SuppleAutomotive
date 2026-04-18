-- Preferred channel for customer notifications (email vs SMS mirror)
alter table public.customers
  add column if not exists contact_preference text not null default 'email';

comment on column public.customers.contact_preference is 'email | sms — when sms, transactional emails are also sent as short SMS with portal magic link';
