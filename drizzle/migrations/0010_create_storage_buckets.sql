-- Private storage buckets used by the app. The storage policies for them live in 0002.
-- Idempotent: environments that already have these buckets are unaffected, and a fresh Supabase
-- project gets them (previously no migration created them, so uploads failed on new projects).
insert into storage.buckets (id, name, public)
values ('media', 'media', false), ('pitch-decks', 'pitch-decks', false)
on conflict (id) do nothing;
