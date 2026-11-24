-- Allow general users to create surveys they own. Ownership stays on founder_id = auth.uid().
-- Do not weaken draft privacy, update/delete ownership, or startup linking.

drop policy if exists "surveys_insert" on public.surveys;
create policy "surveys_insert" on public.surveys for insert to authenticated with check (
  founder_id = auth.uid()
  and (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'general_user'))
  and (
    startup_id is null
    or (public.has_role(auth.uid(), 'founder') and public.startup_owner(startup_id) = auth.uid())
  )
);

drop policy if exists "surveys_update" on public.surveys;
create policy "surveys_update" on public.surveys for update to authenticated
  using (founder_id = auth.uid())
  with check (
    founder_id = auth.uid()
    and (startup_id is null or public.startup_owner(startup_id) = auth.uid())
  );
