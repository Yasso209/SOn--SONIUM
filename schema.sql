-- SONIUM server schema (Supabase / Postgres)
-- Run the whole file once in: Supabase dashboard > SQL Editor > New query > Run.
-- Safe to re-run on an empty project. Design rules:
--   * Accounts use Supabase anonymous sign-in (no email/password); each phone gets an identity.
--   * Nobody is a crew admin. Any member can invite, anyone can leave, nobody can remove others.
--   * The app owner (you) is listed in app_admins and manages bans/reports from the dashboard.
--   * Points are set by the server from task_catalog, so the app cannot invent points.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player' check (char_length(name) between 1 and 24),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 28),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  start_date date not null default current_date,
  days int not null default 14,
  penalty text not null default 'treat' check (penalty in ('treat','judge','custom')),
  penalty_custom text check (char_length(penalty_custom) <= 50),
  created_at timestamptz not null default now()
);
create table public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create table public.task_catalog (id text primary key,title text not null,points int not null check (points >= 0));
insert into public.task_catalog (id,title,points) values
('water','Drink 2L of water',5),('read','Read for 20 minutes',10),('workout','Workout',20),('plan','Plan tomorrow',5),('prayers','Daily prayers',15),('shower','Take a shower',5),('study','Study for 1 hour',10),
('prayers_fajr','Fajr',0),('prayers_dhuhr','Dhuhr',0),('prayers_asr','Asr',0),('prayers_maghrib','Maghrib',0),('prayers_isha','Isha',0);
create table public.completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  day int not null check (day >= 1),
  task_id text not null references public.task_catalog(id),
  points int not null default 0,
  done_at timestamptz not null default now(),
  primary key (user_id,crew_id,day,task_id)
);
create table public.shared_tasks (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  points int not null default 20,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.shared_proofs (
  id uuid primary key default gen_random_uuid(),
  shared_task_id uuid not null references public.shared_tasks(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now(),
  unique (shared_task_id,user_id)
);
create table public.messages (
  id bigint generated always as identity primary key,
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 300),
  sticker text check (char_length(sticker) <= 40),
  created_at timestamptz not null default now(),
  check (body is not null or sticker is not null)
);
create index messages_crew_time on public.messages (crew_id,created_at desc);
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  crew_id uuid references public.crews(id) on delete set null,
  message_id bigint,
  reason text not null check (reason in ('abuse','harassment','inappropriate','spam','other')),
  note text check (char_length(note) <= 300),
  status text not null default 'new' check (status in ('new','reviewing','closed')),
  created_at timestamptz not null default now()
);
create table public.app_admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crew_members m join public.profiles p on p.id=m.user_id
    where m.crew_id=c and m.user_id=auth.uid() and not p.banned)
$$;
create or replace function public.shares_crew(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crew_members a join public.crew_members b on a.crew_id=b.crew_id
    where a.user_id=auth.uid() and b.user_id=u)
$$;
create or replace function public.challenge_day(c uuid) returns int
language sql stable security definer set search_path = public as $$
  select (current_date-start_date)+1 from public.crews where id=c
$$;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.set_points() returns trigger
language plpgsql security definer set search_path = public as $$
begin select points into new.points from public.task_catalog where id=new.task_id; return new; end $$;
create trigger completions_set_points before insert on public.completions for each row execute function public.set_points();

create or replace function public.create_crew(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or exists(select 1 from public.profiles where id=auth.uid() and banned) then raise exception 'not allowed'; end if;
  insert into public.crews(name) values(left(trim(p_name),28)) returning id into cid;
  insert into public.crew_members(crew_id,user_id) values(cid,auth.uid()); return cid;
end $$;
create or replace function public.join_crew(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or exists(select 1 from public.profiles where id=auth.uid() and banned) then raise exception 'not allowed'; end if;
  select id into cid from public.crews where invite_code=upper(trim(p_code));
  if cid is null then raise exception 'invalid invite code'; end if;
  insert into public.crew_members(crew_id,user_id) values(cid,auth.uid()) on conflict do nothing; return cid;
end $$;
revoke execute on function public.create_crew(text) from public,anon;
revoke execute on function public.join_crew(text) from public,anon;
grant execute on function public.create_crew(text) to authenticated;
grant execute on function public.join_crew(text) to authenticated;

create view public.crew_leaderboard with (security_invoker=on) as
select cm.crew_id,cm.user_id,p.name,
  coalesce((select sum(c.points) from public.completions c where c.crew_id=cm.crew_id and c.user_id=cm.user_id),0)
  + coalesce((select sum(st.points) from public.shared_proofs sp join public.shared_tasks st on st.id=sp.shared_task_id where sp.crew_id=cm.crew_id and sp.user_id=cm.user_id),0) as points
from public.crew_members cm join public.profiles p on p.id=cm.user_id;

alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.task_catalog enable row level security;
alter table public.completions enable row level security;
alter table public.shared_tasks enable row level security;
alter table public.shared_proofs enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.app_admins enable row level security;

create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.shares_crew(id) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke update on public.profiles from authenticated,anon;
grant update(name) on public.profiles to authenticated;
create policy crews_select on public.crews for select to authenticated using(public.is_member(id) or public.is_admin());
create policy crews_update on public.crews for update to authenticated using(public.is_member(id)) with check(public.is_member(id));
revoke update on public.crews from authenticated,anon;
grant update(name,penalty,penalty_custom) on public.crews to authenticated;
create policy members_select on public.crew_members for select to authenticated using(public.is_member(crew_id) or public.is_admin());
create policy members_leave on public.crew_members for delete to authenticated using(user_id=auth.uid());
create policy catalog_select on public.task_catalog for select to authenticated using(true);
create policy completions_select on public.completions for select to authenticated using(public.is_member(crew_id) or public.is_admin());
create policy completions_insert on public.completions for insert to authenticated with check(user_id=auth.uid() and public.is_member(crew_id) and day=public.challenge_day(crew_id) and day between 1 and (select days from public.crews where id=crew_id));
create policy completions_delete on public.completions for delete to authenticated using(user_id=auth.uid() and public.is_member(crew_id) and day=public.challenge_day(crew_id));
create policy shared_select on public.shared_tasks for select to authenticated using(public.is_member(crew_id) or public.is_admin());
create policy shared_insert on public.shared_tasks for insert to authenticated with check(created_by=auth.uid() and public.is_member(crew_id) and points=20);
create policy shared_delete on public.shared_tasks for delete to authenticated using(created_by=auth.uid());
create policy proofs_select on public.shared_proofs for select to authenticated using(public.is_member(crew_id) or public.is_admin());
create policy proofs_insert on public.shared_proofs for insert to authenticated with check(user_id=auth.uid() and public.is_member(crew_id) and exists(select 1 from public.shared_tasks st where st.id=shared_task_id and st.crew_id=shared_proofs.crew_id));
create policy proofs_delete on public.shared_proofs for delete to authenticated using(user_id=auth.uid());
create policy messages_select on public.messages for select to authenticated using(public.is_member(crew_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated with check(user_id=auth.uid() and public.is_member(crew_id));
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and (crew_id is null or public.is_member(crew_id)));
create policy reports_select on public.reports for select to authenticated using(public.is_admin());

insert into storage.buckets(id,name,public) values('proofs','proofs',false) on conflict(id) do nothing;
create policy proofs_read on storage.objects for select to authenticated using(bucket_id='proofs' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy proofs_upload on storage.objects for insert to authenticated with check(bucket_id='proofs' and public.is_member(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2]=auth.uid()::text);
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.completions;
alter publication supabase_realtime add table public.shared_proofs;
alter publication supabase_realtime add table public.crew_members;
