-- Add private investor-specific verification fields.
-- Founder columns and existing verification RLS are unchanged.

alter table public.verification_records
  add column if not exists investor_type text,
  add column if not exists professional_role text;
