-- Index the added foreign keys used by joins and cascades.
create index if not exists personal_tasks_crew_id_idx on public.personal_tasks(crew_id);
create index if not exists shared_proof_reviews_reviewer_id_idx on public.shared_proof_reviews(reviewer_id);
