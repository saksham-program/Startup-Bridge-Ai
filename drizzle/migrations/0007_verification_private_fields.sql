-- Add private identity/company fields to verification_records.
-- These stay owner-only via existing verification_records RLS.
-- Public profile tables are unchanged. Identity documents are not added in this step.

alter table public.verification_records
  add column if not exists legal_name text,
  add column if not exists date_of_birth date,
  add column if not exists legal_company_name text,
  add column if not exists company_registration text,
  add column if not exists ownership_attestation boolean not null default false,
  add column if not exists startup_id uuid references public.startups(id) on delete set null;

drop policy if exists "vr_ins" on public.verification_records;
create policy "vr_ins" on public.verification_records for insert to authenticated with check (
  user_id = auth.uid()
  and (public.has_role(auth.uid(), 'investor') or public.has_role(auth.uid(), 'founder'))
  and not public.has_role(auth.uid(), 'general_user')
  and (
    startup_id is null
    or (public.has_role(auth.uid(), 'founder') and public.startup_owner(startup_id) = auth.uid())
  )
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
    and (
      startup_id is null
      or (public.has_role(auth.uid(), 'founder') and public.startup_owner(startup_id) = auth.uid())
    )
  );
