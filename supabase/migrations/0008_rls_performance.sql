-- Improve RLS policy evaluation by evaluating auth.uid() once per statement.
-- Preserve the existing membership and ownership predicates.
alter policy completions_delete on public.completions
  using (user_id = (select auth.uid()) and is_member(crew_id) and day = challenge_day(crew_id));
alter policy completions_insert on public.completions
  with check (user_id = (select auth.uid()) and is_member(crew_id) and day = challenge_day(crew_id)
    and day between 1 and (select days from public.crews where id = completions.crew_id));
alter policy messages_insert on public.messages
  with check (user_id = (select auth.uid()) and is_member(crew_id));
alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or shares_crew(id) or is_admin());
alter policy reports_insert on public.reports
  with check (
    reporter_id = (select auth.uid())
    and reporter_id <> reported_id
    and crew_id is not null
    and is_member(crew_id)
    and exists (
      select 1 from public.crew_members cm
      where cm.crew_id = reports.crew_id and cm.user_id = reports.reported_id
    )
    and (message_id is null or exists (
      select 1 from public.messages m
      where m.id = reports.message_id
        and m.crew_id = reports.crew_id
        and m.user_id = reports.reported_id
    ))
  );
alter policy proofs_delete on public.shared_proofs
  using (user_id = (select auth.uid()));
alter policy proofs_insert on public.shared_proofs
  with check (
    user_id = (select auth.uid())
    and is_member(crew_id)
    and exists (
      select 1 from public.shared_tasks st
      where st.id = shared_proofs.shared_task_id and st.crew_id = shared_proofs.crew_id
    )
  );
alter policy shared_delete on public.shared_tasks
  using (created_by = (select auth.uid()) and is_member(crew_id));
alter policy shared_insert on public.shared_tasks
  with check (created_by = (select auth.uid()) and is_member(crew_id) and points = 20);

-- The prior composite index serves crew/member lookups; this one covers FK joins by user.
create index if not exists shared_proofs_user_id_idx
  on public.shared_proofs(user_id);
