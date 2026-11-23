-- Move privileged RPC implementations into the non-exposed private schema.
-- Public functions remain SECURITY INVOKER wrappers for authenticated app users.
begin;

create or replace function private.admin_delete_crew(p_crew_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  delete from public.crews where id = p_crew_id;
  if not found then raise exception 'crew not found'; end if;
end;
$$;

create or replace function private.admin_delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  delete from public.messages where id = p_message_id;
  if not found then raise exception 'message not found'; end if;
end;
$$;

create or replace function private.admin_remove_crew_member(p_crew_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  delete from public.crew_members where crew_id = p_crew_id and user_id = p_user_id;
  if not found then raise exception 'crew membership not found'; end if;
end;
$$;

create or replace function private.admin_set_banned(p_user_id uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if p_user_id is null then raise exception 'user id is required'; end if;
  if p_user_id = auth.uid() and p_banned then raise exception 'admin cannot ban their own account'; end if;
  update public.profiles set banned = p_banned where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
end;
$$;

create or replace function private.admin_update_report(p_report_id bigint, p_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if p_status is null or p_status not in ('new','reviewing','closed') then raise exception 'invalid report status'; end if;
  update public.reports set status = p_status where id = p_report_id;
  if not found then raise exception 'report not found'; end if;
end;
$$;

create or replace function private.create_crew(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare cid uuid;
begin
  if auth.uid() is null or exists(select 1 from public.profiles where id = auth.uid() and banned) then raise exception 'not allowed'; end if;
  insert into public.crews(name) values(left(trim(p_name),28)) returning id into cid;
  insert into public.crew_members(crew_id,user_id) values(cid,auth.uid());
  return cid;
end;
$$;

create or replace function private.join_crew(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare cid uuid;
begin
  if auth.uid() is null or exists(select 1 from public.profiles where id = auth.uid() and banned) then raise exception 'not allowed'; end if;
  select id into cid from public.crews where invite_code = upper(trim(p_code));
  if cid is null then raise exception 'invalid invite code'; end if;
  insert into public.crew_members(crew_id,user_id) values(cid,auth.uid()) on conflict do nothing;
  return cid;
end;
$$;

revoke all on function private.admin_delete_crew(uuid) from public, anon, authenticated;
revoke all on function private.admin_delete_message(bigint) from public, anon, authenticated;
revoke all on function private.admin_remove_crew_member(uuid,uuid) from public, anon, authenticated;
revoke all on function private.admin_set_banned(uuid,boolean) from public, anon, authenticated;
revoke all on function private.admin_update_report(bigint,text) from public, anon, authenticated;
revoke all on function private.create_crew(text) from public, anon, authenticated;
revoke all on function private.join_crew(text) from public, anon, authenticated;
grant execute on function private.admin_delete_crew(uuid) to authenticated;
grant execute on function private.admin_delete_message(bigint) to authenticated;
grant execute on function private.admin_remove_crew_member(uuid,uuid) to authenticated;
grant execute on function private.admin_set_banned(uuid,boolean) to authenticated;
grant execute on function private.admin_update_report(bigint,text) to authenticated;
grant execute on function private.create_crew(text) to authenticated;
grant execute on function private.join_crew(text) to authenticated;

create or replace function public.admin_delete_crew(p_crew_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_delete_crew(p_crew_id); $$;
create or replace function public.admin_delete_message(p_message_id bigint)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_delete_message(p_message_id); $$;
create or replace function public.admin_remove_crew_member(p_crew_id uuid, p_user_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_remove_crew_member(p_crew_id,p_user_id); $$;
create or replace function public.admin_set_banned(p_user_id uuid, p_banned boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_set_banned(p_user_id,p_banned); $$;
create or replace function public.admin_update_report(p_report_id bigint, p_status text)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_update_report(p_report_id,p_status); $$;
create or replace function public.create_crew(p_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_crew(p_name); $$;
create or replace function public.join_crew(p_code text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.join_crew(p_code); $$;

revoke execute on function public.admin_delete_crew(uuid) from public, anon;
revoke execute on function public.admin_delete_message(bigint) from public, anon;
revoke execute on function public.admin_remove_crew_member(uuid,uuid) from public, anon;
revoke execute on function public.admin_set_banned(uuid,boolean) from public, anon;
revoke execute on function public.admin_update_report(bigint,text) from public, anon;
revoke execute on function public.create_crew(text) from public, anon;
revoke execute on function public.join_crew(text) from public, anon;
grant execute on function public.admin_delete_crew(uuid) to authenticated;
grant execute on function public.admin_delete_message(bigint) to authenticated;
grant execute on function public.admin_remove_crew_member(uuid,uuid) to authenticated;
grant execute on function public.admin_set_banned(uuid,boolean) to authenticated;
grant execute on function public.admin_update_report(bigint,text) to authenticated;
grant execute on function public.create_crew(text) to authenticated;
grant execute on function public.join_crew(text) to authenticated;

commit;
