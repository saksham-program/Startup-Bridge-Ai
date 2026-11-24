-- Founder verification reuses verification_records and verification_status.
-- Public status lives on founder_profiles (same pattern as investor_profiles).
-- Private verification details stay in verification_records (own-row RLS).
-- Existing investor verification data and policies are preserved.

alter table public.founder_profiles
  add column if not exists verification_status public.verification_status not null default 'pending';

drop policy if exists "fp_update" on public.founder_profiles;
create policy "fp_update" on public.founder_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and verification_status = (select verification_status from public.founder_profiles p where p.user_id = auth.uid())
  );

create or replace function public.is_verified_founder(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.founder_profiles where user_id = _user_id and verification_status = 'verified')
$$;

create or replace function public.tg_verification_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.investor_profiles set verification_status = new.status where user_id = new.user_id;
  update public.founder_profiles set verification_status = new.status where user_id = new.user_id;
  return new;
end $$;

drop policy if exists "vr_ins" on public.verification_records;
create policy "vr_ins" on public.verification_records for insert to authenticated with check (
  user_id = auth.uid()
  and (public.has_role(auth.uid(), 'investor') or public.has_role(auth.uid(), 'founder'))
  and not public.has_role(auth.uid(), 'general_user')
);

drop policy if exists "vr_upd" on public.verification_records;
create policy "vr_upd" on public.verification_records for update to authenticated
  using (
    user_id = auth.uid()
    and (public.has_role(auth.uid(), 'investor') or public.has_role(auth.uid(), 'founder'))
    and not public.has_role(auth.uid(), 'general_user')
  )
  with check (
    user_id = auth.uid()
    and (public.has_role(auth.uid(), 'investor') or public.has_role(auth.uid(), 'founder'))
    and not public.has_role(auth.uid(), 'general_user')
  );
