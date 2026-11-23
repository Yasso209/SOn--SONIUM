-- Index foreign-key columns and the app's most common crew-scoped lookups.
create index if not exists completions_crew_user_day_idx
  on public.completions(crew_id,user_id,day);
create index if not exists completions_task_id_idx
  on public.completions(task_id);
create index if not exists messages_user_id_idx
  on public.messages(user_id);
create index if not exists reports_crew_id_idx
  on public.reports(crew_id);
create index if not exists reports_message_id_idx
  on public.reports(message_id);
create index if not exists reports_reported_id_idx
  on public.reports(reported_id);
create index if not exists reports_reporter_id_idx
  on public.reports(reporter_id);
create index if not exists shared_proofs_crew_user_idx
  on public.shared_proofs(crew_id,user_id);
create index if not exists shared_tasks_crew_created_at_idx
  on public.shared_tasks(crew_id,created_at desc);
create index if not exists shared_tasks_created_by_idx
  on public.shared_tasks(created_by);
