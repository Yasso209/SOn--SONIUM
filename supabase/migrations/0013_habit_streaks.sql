-- Habit streaks: personal, point-free habits (shower, prayer, gaming, ...) that a member
-- can tick off once per challenge day. Owner-only access; today-only writes, like completions.
begin;

create table if not exists public.habit_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 40),
  icon text not null default 'flame-outline',
  weekly_target integer not null default 0 check (weekly_target between 0 and 7),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_checks (
  streak_id uuid not null references public.habit_streaks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  day integer not null check (day >= 1),
  done_at timestamptz not null default now(),
  primary key (streak_id, day)
);

create index if not exists habit_streaks_user_crew_idx on public.habit_streaks(user_id, crew_id);
create index if not exists habit_streaks_crew_idx on public.habit_streaks(crew_id);
create index if not exists habit_checks_user_crew_idx on public.habit_checks(user_id, crew_id);
create index if not exists habit_checks_crew_idx on public.habit_checks(crew_id);

alter table public.habit_streaks enable row level security;
alter table public.habit_checks enable row level security;

create policy habit_streaks_select on public.habit_streaks for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy habit_streaks_insert on public.habit_streaks for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member(crew_id)));
create policy habit_streaks_update on public.habit_streaks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.is_member(crew_id)));
create policy habit_streaks_delete on public.habit_streaks for delete to authenticated
  using (user_id = (select auth.uid()));

create policy habit_checks_select on public.habit_checks for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy habit_checks_insert on public.habit_checks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_member(crew_id))
    and day = (select public.challenge_day(crew_id))
    and day between 1 and (select days from public.crews where id = habit_checks.crew_id)
    and exists (
      select 1 from public.habit_streaks s
      where s.id = habit_checks.streak_id and s.user_id = (select auth.uid()) and s.crew_id = habit_checks.crew_id
    )
  );
create policy habit_checks_delete on public.habit_checks for delete to authenticated
  using (user_id = (select auth.uid()) and day = (select public.challenge_day(crew_id)));

commit;
