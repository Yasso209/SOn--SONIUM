-- SONIUM security hardening migration
-- Apply AFTER 0001_initial_schema.sql. Review before applying to a live project.
begin;
create or replace function public.shares_crew(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crew_members a
    join public.profiles caller on caller.id=a.user_id and not caller.banned
    join public.crew_members b on a.crew_id=b.crew_id
    where a.user_id=auth.uid() and b.user_id=u
  )
$$;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='reports_message_id_fkey' and conrelid='public.reports'::regclass) then
    alter table public.reports add constraint reports_message_id_fkey foreign key(message_id) references public.messages(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='reports_not_self_check' and conrelid='public.reports'::regclass) then
    alter table public.reports add constraint reports_not_self_check check(reporter_id<>reported_id) not valid;
  end if;
end $$;
alter table public.reports validate constraint reports_not_self_check;
create index if not exists reports_created_at_desc on public.reports(created_at desc);
create index if not exists reports_status_created_at on public.reports(status,created_at desc);
create index if not exists crew_members_user_id on public.crew_members(user_id);

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check(
  reporter_id=auth.uid() and reporter_id<>reported_id and crew_id is not null and public.is_member(crew_id)
  and exists(select 1 from public.crew_members cm where cm.crew_id=reports.crew_id and cm.user_id=reports.reported_id)
  and (message_id is null or exists(select 1 from public.messages m where m.id=reports.message_id and m.crew_id=reports.crew_id and m.user_id=reports.reported_id))
);
drop policy if exists shared_delete on public.shared_tasks;
create policy shared_delete on public.shared_tasks for delete to authenticated using(created_by=auth.uid() and public.is_member(crew_id));

create or replace function public.validate_shared_proof_file() returns trigger
language plpgsql security definer set search_path=public,storage as $$
begin
  if new.user_id<>auth.uid() and not public.is_admin() then raise exception 'proof user must match the signed-in user'; end if;
  if split_part(new.photo_path,'/',1)<>new.crew_id::text or split_part(new.photo_path,'/',2)<>new.user_id::text or split_part(new.photo_path,'/',3)='' then raise exception 'invalid proof storage path'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='proofs' and o.name=new.photo_path) then raise exception 'proof file does not exist in private storage'; end if;
  if not exists(select 1 from public.shared_tasks st where st.id=new.shared_task_id and st.crew_id=new.crew_id) then raise exception 'task does not belong to this crew'; end if;
  return new;
end;
$$;
drop trigger if exists shared_proofs_validate_file on public.shared_proofs;
create trigger shared_proofs_validate_file before insert or update of shared_task_id,crew_id,user_id,photo_path on public.shared_proofs for each row execute function public.validate_shared_proof_file();

create or replace function public.admin_set_banned(p_user_id uuid,p_banned boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_user_id is null then raise exception 'user id is required'; end if;
  if p_user_id=auth.uid() and p_banned then raise exception 'admin cannot ban their own account'; end if;
  update public.profiles set banned=p_banned where id=p_user_id;
  if not found then raise exception 'user not found'; end if;
end;
$$;
create or replace function public.admin_update_report(p_report_id bigint,p_status text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_status is null or p_status not in ('new','reviewing','closed') then raise exception 'invalid report status'; end if;
  update public.reports set status=p_status where id=p_report_id;
  if not found then raise exception 'report not found'; end if;
end;
$$;
create or replace function public.admin_remove_crew_member(p_crew_id uuid,p_user_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  delete from public.crew_members where crew_id=p_crew_id and user_id=p_user_id;
  if not found then raise exception 'crew membership not found'; end if;
end;
$$;
create or replace function public.admin_delete_crew(p_crew_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  delete from public.crews where id=p_crew_id;
  if not found then raise exception 'crew not found'; end if;
end;
$$;
create or replace function public.admin_delete_message(p_message_id bigint) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  delete from public.messages where id=p_message_id;
  if not found then raise exception 'message not found'; end if;
end;
$$;
revoke all on function public.admin_set_banned(uuid,boolean) from public,anon;
revoke all on function public.admin_update_report(bigint,text) from public,anon;
revoke all on function public.admin_remove_crew_member(uuid,uuid) from public,anon;
revoke all on function public.admin_delete_crew(uuid) from public,anon;
revoke all on function public.admin_delete_message(bigint) from public,anon;
grant execute on function public.admin_set_banned(uuid,boolean) to authenticated;
grant execute on function public.admin_update_report(bigint,text) to authenticated;
grant execute on function public.admin_remove_crew_member(uuid,uuid) to authenticated;
grant execute on function public.admin_delete_crew(uuid) to authenticated;
grant execute on function public.admin_delete_message(bigint) to authenticated;
revoke update(banned) on public.profiles from anon,authenticated;
revoke update(status) on public.reports from anon,authenticated;
commit;
