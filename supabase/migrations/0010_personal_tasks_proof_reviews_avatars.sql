-- SONIUM 0010: user-owned tasks and subtasks, peer review, and synced avatars.
begin;
alter table public.profiles add column if not exists avatar_path text;
revoke update on public.profiles from authenticated, anon;
grant update(name, avatar_path) on public.profiles to authenticated;

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  details text,
  points integer not null default 10 check (points between 0 and 100),
  icon text not null default 'checkmark-circle-outline',
  subtasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(subtasks) = 'array' and jsonb_array_length(subtasks) <= 12),
  reminder_enabled boolean not null default false,
  reminder_time time,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_tasks_reminder_time_check check (not reminder_enabled or reminder_time is not null)
);
create index if not exists personal_tasks_owner_crew_order_idx on public.personal_tasks(user_id,crew_id,sort_order,created_at);
alter table public.personal_tasks enable row level security;
drop policy if exists personal_tasks_select on public.personal_tasks;
drop policy if exists personal_tasks_insert on public.personal_tasks;
drop policy if exists personal_tasks_update on public.personal_tasks;
drop policy if exists personal_tasks_delete on public.personal_tasks;
create policy personal_tasks_select on public.personal_tasks for select to authenticated
  using(user_id=(select auth.uid()) and public.is_member(crew_id));
create policy personal_tasks_insert on public.personal_tasks for insert to authenticated
  with check(user_id=(select auth.uid()) and public.is_member(crew_id));
create policy personal_tasks_update on public.personal_tasks for update to authenticated
  using(user_id=(select auth.uid()) and public.is_member(crew_id))
  with check(user_id=(select auth.uid()) and public.is_member(crew_id));
create policy personal_tasks_delete on public.personal_tasks for delete to authenticated
  using(user_id=(select auth.uid()) and public.is_member(crew_id));
revoke all on public.personal_tasks from anon;
grant select,insert,update,delete on public.personal_tasks to authenticated;

alter table public.completions drop constraint if exists completions_task_id_fkey;
revoke all on function public.set_points() from public,anon,authenticated;
grant execute on function public.set_points() to postgres;

create table if not exists public.shared_proof_reviews (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null references public.shared_proofs(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  approved boolean not null,
  note text check(note is null or char_length(note)<=240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(proof_id,reviewer_id)
);
create index if not exists shared_proof_reviews_crew_proof_idx on public.shared_proof_reviews(crew_id,proof_id);
alter table public.shared_proof_reviews enable row level security;
drop policy if exists proof_reviews_select on public.shared_proof_reviews;
drop policy if exists proof_reviews_insert on public.shared_proof_reviews;
drop policy if exists proof_reviews_update on public.shared_proof_reviews;
create policy proof_reviews_select on public.shared_proof_reviews for select to authenticated
  using(public.is_member(crew_id) or public.is_admin());
create policy proof_reviews_insert on public.shared_proof_reviews for insert to authenticated
  with check(reviewer_id=(select auth.uid()) and public.is_member(crew_id) and exists(
    select 1 from public.shared_proofs p where p.id=proof_id and p.crew_id=shared_proof_reviews.crew_id
      and p.user_id<>(select auth.uid())
  ));
create policy proof_reviews_update on public.shared_proof_reviews for update to authenticated
  using(reviewer_id=(select auth.uid()) and public.is_member(crew_id))
  with check(reviewer_id=(select auth.uid()) and public.is_member(crew_id) and exists(
    select 1 from public.shared_proofs p where p.id=proof_id and p.crew_id=shared_proof_reviews.crew_id
      and p.user_id<>(select auth.uid())
  ));
revoke all on public.shared_proof_reviews from anon;
grant select,insert,update on public.shared_proof_reviews to authenticated;

create or replace function public.validate_shared_proof_review()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.reviewer_id<>auth.uid() then raise exception 'reviewer must match signed-in user'; end if;
  if not public.is_member(new.crew_id) then raise exception 'reviewer must be a crew member'; end if;
  if not exists(select 1 from public.shared_proofs p where p.id=new.proof_id and p.crew_id=new.crew_id and p.user_id<>auth.uid()) then
    raise exception 'members can only review another member proof from the same crew';
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
drop trigger if exists shared_proof_reviews_validate on public.shared_proof_reviews;
create trigger shared_proof_reviews_validate before insert or update on public.shared_proof_reviews
  for each row execute function public.validate_shared_proof_review();
revoke all on function public.validate_shared_proof_review() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_upload on storage.objects;
drop policy if exists avatars_delete on storage.objects;
create policy avatars_read on storage.objects for select to authenticated
  using(bucket_id='avatars' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or public.shares_crew(((storage.foldername(name))[1])::uuid)
    or public.is_admin()
  ));
create policy avatars_upload on storage.objects for insert to authenticated
  with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;