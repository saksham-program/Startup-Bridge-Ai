-- media bucket: any signed-in user can read; users write only in their own folder
create policy "media_read" on storage.objects for select to authenticated using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update" on storage.objects for update to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- pitch-decks: owner folder; readable by owner or verified investors connected to the owner
create policy "decks_read" on storage.objects for select to authenticated using (
  bucket_id = 'pitch-decks' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (public.is_verified_investor(auth.uid()) and public.is_connected(auth.uid(), ((storage.foldername(name))[1])::uuid))
  )
);
create policy "decks_insert" on storage.objects for insert to authenticated with check (bucket_id = 'pitch-decks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "decks_delete" on storage.objects for delete to authenticated using (bucket_id = 'pitch-decks' and (storage.foldername(name))[1] = auth.uid()::text);