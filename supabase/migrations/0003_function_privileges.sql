-- SONIUM function privilege hardening.
-- Applied to project jengdekjfrizdypysjef after migrations 0001 and 0002.

begin;

-- Internal trigger functions must never be callable through the public Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_points() from public, anon, authenticated;
revoke execute on function public.validate_shared_proof_file() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- RLS helpers are required by authenticated policies and app checks, but not anonymous API callers.
revoke execute on function public.challenge_day(uuid) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.shares_crew(uuid) from public, anon;
grant execute on function public.challenge_day(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.shares_crew(uuid) to authenticated;

-- app_admins is read by is_admin() as its function owner; API table access is not needed.
revoke all on table public.app_admins from anon, authenticated;

-- Restrict the default execution grants for future functions created by postgres-owned migrations.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- Cache auth.uid() for row-invariant policy checks.
drop policy if exists members_leave on public.crew_members;
create policy members_leave on public.crew_members
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

commit;
