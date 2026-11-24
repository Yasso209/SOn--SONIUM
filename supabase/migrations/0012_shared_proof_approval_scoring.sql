-- Award shared-task leaderboard points only after every other crew member
-- has reviewed the proof and every vote approves it.
create or replace view public.crew_leaderboard
with (security_invoker = true)
as
select
  cm.crew_id,
  cm.user_id,
  p.name,
  coalesce((
    select sum(c.points)
    from public.completions c
    where c.crew_id=cm.crew_id and c.user_id=cm.user_id
  ),0::bigint)
  +
  coalesce((
    select sum(st.points)
    from public.shared_proofs sp
    join public.shared_tasks st on st.id=sp.shared_task_id
    where sp.crew_id=cm.crew_id
      and sp.user_id=cm.user_id
      and (
        select count(*) from public.crew_members eligible
        where eligible.crew_id=sp.crew_id and eligible.user_id<>sp.user_id
      ) = (
        select count(*) from public.shared_proof_reviews r
        where r.proof_id=sp.id
      )
      and (
        select count(*) from public.shared_proof_reviews approved
        where approved.proof_id=sp.id and approved.approved=true
      ) = (
        select count(*) from public.crew_members eligible
        where eligible.crew_id=sp.crew_id and eligible.user_id<>sp.user_id
      )
  ),0::bigint) as points
from public.crew_members cm
join public.profiles p on p.id=cm.user_id;
