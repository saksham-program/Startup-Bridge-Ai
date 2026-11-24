-- Tighten over-permissive SELECT policies flagged by the security scanner.
-- user_roles: users may read only their own roles; moderators may read all (needed for moderation tooling).
drop policy if exists "roles_select" on public.user_roles;
create policy "roles_select"
  on public.user_roles
  for select
  to authenticated
  using ((user_id = auth.uid()) or public.has_role(auth.uid(), 'moderator'::app_role));

-- votes: voters only ever read their own votes (per-user voting state; counts live on problems.upvote_count).
drop policy if exists "votes_select" on public.votes;
create policy "votes_select"
  on public.votes
  for select
  to authenticated
  using (user_id = auth.uid());

-- Grants already exist and are unchanged; policies only. Verify RLS stays enabled:
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass) then
    alter table public.user_roles enable row level security;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.votes'::regclass) then
    alter table public.votes enable row level security;
  end if;
end $$;