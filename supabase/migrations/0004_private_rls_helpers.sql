-- Authorization helpers isolated from the exposed Data API schema.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins where user_id = auth.uid()); $$;

create or replace function private.is_member(c uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.crew_members m
    join public.profiles p on p.id = m.user_id
    where m.crew_id = c and m.user_id = auth.uid() and not p.banned
  );
$$;

create or replace function private.shares_crew(u uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.crew_members a
    join public.profiles caller on caller.id = a.user_id and not caller.banned
    join public.crew_members b on b.crew_id = a.crew_id
    where a.user_id = auth.uid() and b.user_id = u
  );
$$;

create or replace function private.challenge_day(c uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  select (current_date - start_date) + 1 from public.crews where id = c;
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.is_member(uuid) from public, anon, authenticated;
revoke all on function private.shares_crew(uuid) from public, anon, authenticated;
revoke all on function private.challenge_day(uuid) from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.shares_crew(uuid) to authenticated;
grant execute on function private.challenge_day(uuid) to authenticated;

alter default privileges for role postgres in schema private revoke execute on functions from public;
alter default privileges for role postgres in schema private revoke execute on functions from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin(); $$;

create or replace function public.is_member(c uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_member(c); $$;

create or replace function public.shares_crew(u uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.shares_crew(u); $$;

create or replace function public.challenge_day(c uuid)
returns integer language sql stable security invoker set search_path = ''
as $$ select private.challenge_day(c); $$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.shares_crew(uuid) from public, anon;
revoke execute on function public.challenge_day(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.shares_crew(uuid) to authenticated;
grant execute on function public.challenge_day(uuid) to authenticated;

commit;
