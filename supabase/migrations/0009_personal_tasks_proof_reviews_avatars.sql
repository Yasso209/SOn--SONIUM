-- Expand server-side completion point resolution to user-owned task UUIDs.
-- Parent task steps are recorded as <task-uuid>:sub:<index> and earn zero points.
create or replace function public.set_points()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_points integer; v_parent text;
begin
  if new.user_id <> auth.uid() then raise exception 'completion user must match signed-in user'; end if;
  select points into v_points from public.task_catalog where id=new.task_id;
  if not found then
    if position(':sub:' in new.task_id)>0 then
      v_parent:=split_part(new.task_id,':sub:',1);
      perform 1 from public.personal_tasks
        where id::text=v_parent and user_id=new.user_id and crew_id=new.crew_id;
      if not found then raise exception 'personal task step not found or not owned'; end if;
      v_points:=0;
    else
      select points into v_points from public.personal_tasks
        where id::text=new.task_id and user_id=new.user_id and crew_id=new.crew_id;
      if not found then raise exception 'task not found or not owned'; end if;
    end if;
  end if;
  new.points:=coalesce(v_points,0);
  return new;
end;
$$;