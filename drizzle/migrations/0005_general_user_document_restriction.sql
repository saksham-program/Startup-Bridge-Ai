-- Block general_user from selecting startup document metadata.
-- Founder (owner) and authorized verified-investor access are unchanged.

drop policy if exists "docs_select" on public.documents;
create policy "docs_select" on public.documents for select to authenticated using (
  owner_id = auth.uid()
  or (
    not public.has_role(auth.uid(), 'general_user')
    and (
      (not is_private and public.can_view_startup(startup_id, auth.uid()))
      or (public.is_verified_investor(auth.uid()) and public.is_connected(auth.uid(), owner_id))
    )
  )
);

-- Explicitly keep general_user out of pitch-deck storage reads.
-- Owner-folder and verified connected investor access are unchanged.

drop policy if exists "decks_read" on storage.objects;
create policy "decks_read" on storage.objects for select to authenticated using (
  bucket_id = 'pitch-decks' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (
      not public.has_role(auth.uid(), 'general_user')
      and public.is_verified_investor(auth.uid())
      and public.is_connected(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);
