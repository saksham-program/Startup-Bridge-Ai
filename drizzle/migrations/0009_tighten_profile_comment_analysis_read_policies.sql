-- Replace the remaining permissive SELECT policies with real, data-driven visibility predicates.

-- Role profiles: readable for yourself, by moderators, when the base profile is public,
-- or (founders) when a startup owned by the founder is viewable by the reader.
drop policy if exists "fp_select" on public.founder_profiles;
create policy "fp_select"
  on public.founder_profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'moderator'::app_role)
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and (p.is_public or p.id = auth.uid())
    )
    or exists (
      select 1 from public.startups s
      where s.founder_id = user_id and public.can_view_startup(s.id, auth.uid())
    )
  );

drop policy if exists "ip_select" on public.investor_profiles;
create policy "ip_select"
  on public.investor_profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'moderator'::app_role)
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and (p.is_public or p.id = auth.uid())
    )
  );

drop policy if exists "gp_select" on public.general_profiles;
create policy "gp_select"
  on public.general_profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'moderator'::app_role)
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and (p.is_public or p.id = auth.uid())
    )
  );

-- AI analyses follow the visibility of their subject (problem, startup or survey).
drop policy if exists "ai_select" on public.ai_analyses;
create policy "ai_select"
  on public.ai_analyses
  for select
  to authenticated
  using (
    (subject_type = 'problem' and exists (select 1 from public.problems pr where pr.id = subject_id))
    or (subject_type = 'startup' and public.can_view_startup(subject_id, auth.uid()))
    or (subject_type = 'survey' and public.can_view_survey(subject_id, auth.uid()))
  );

-- Comments follow the visibility of their parent problem.
drop policy if exists "comments_select" on public.comments;
create policy "comments_select"
  on public.comments
  for select
  to authenticated
  using (exists (select 1 from public.problems pr where pr.id = problem_id));

-- RLS stays enabled on every touched table (already on; statements are no-ops):
alter table public.founder_profiles enable row level security;
alter table public.investor_profiles enable row level security;
alter table public.general_profiles enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.comments enable row level security;