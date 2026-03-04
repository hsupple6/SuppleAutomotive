-- RLS policies so backend (service_role key) can INSERT/SELECT/UPDATE/DELETE.
-- Use SUPABASE_SERVICE_ROLE_KEY in .env (Project Settings → API → service_role secret), not the anon key.

create policy "service_role_all_accounts"
  on public.accounts for all
  to service_role
  using (true)
  with check (true);

create policy "service_role_all_customers"
  on public.customers for all
  to service_role
  using (true)
  with check (true);

create policy "service_role_all_vehicles"
  on public.vehicles for all
  to service_role
  using (true)
  with check (true);

create policy "service_role_all_services"
  on public.services for all
  to service_role
  using (true)
  with check (true);

create policy "service_role_all_service_parts"
  on public.service_parts for all
  to service_role
  using (true)
  with check (true);
