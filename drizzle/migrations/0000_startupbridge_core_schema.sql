-- ============ ENUMS ============
create type public.app_role as enum ('founder','investor','general_user','moderator');
create type public.connection_status as enum ('pending','accepted','rejected');
create type public.verification_status as enum ('pending','under_review','verified','rejected');
create type public.report_status as enum ('open','reviewed','resolved','dismissed');
create type public.survey_status as enum ('draft','published','closed');

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key,
  full_name text not null,
  avatar_url text,
  bio text,
  location text,
  is_public boolean not null default true,
  notification_prefs jsonb not null default '{"email":true,"inapp":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create table public.profile_private (
  user_id uuid primary key,
  phone text,
  email text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profile_private to authenticated;
grant all on public.profile_private to service_role;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

create table public.founder_profiles (
  user_id uuid primary key,
  skills text[] not null default '{}',
  industry text,
  industry_interests text[] not null default '{}',
  startup_experience text,
  linkedin_url text,
  startup_status text default 'exploring',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.founder_profiles to authenticated;
grant all on public.founder_profiles to service_role;

create table public.investor_profiles (
  user_id uuid primary key,
  investor_type text,
  investment_interests text[] not null default '{}',
  preferred_industries text[] not null default '{}',
  preferred_stages text[] not null default '{}',
  investment_min integer default 0,
  investment_max integer default 0,
  firm_name text,
  professional_profile text,
  website text,
  verification_status public.verification_status not null default 'pending',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.investor_profiles to authenticated;
grant all on public.investor_profiles to service_role;

create table public.general_profiles (
  user_id uuid primary key,
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.general_profiles to authenticated;
grant all on public.general_profiles to service_role;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  policy_version text not null,
  terms_accepted boolean not null,
  privacy_accepted boolean not null,
  ai_disclaimer_accepted boolean not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.consents to authenticated;
grant all on public.consents to service_role;

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null,
  description text not null,
  category text not null,
  location text,
  who_faces text,
  frequency text,
  image_url text,
  tags text[] not null default '{}',
  upvote_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.problems to authenticated;
grant all on public.problems to service_role;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  author_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  problem_id uuid not null references public.problems(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, problem_id)
);
grant select, insert, delete on public.votes to authenticated;
grant all on public.votes to service_role;

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_type text not null,
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);
grant select, insert, delete on public.saved_items to authenticated;
grant all on public.saved_items to service_role;

create table public.topic_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  created_at timestamptz not null default now(),
  unique (user_id, topic)
);
grant select, insert, delete on public.topic_follows to authenticated;
grant all on public.topic_follows to service_role;

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null,
  name text not null,
  tagline text,
  logo_url text,
  problem_id uuid references public.problems(id) on delete set null,
  problem text,
  solution text,
  description text,
  industry text,
  business_model text,
  target_users text,
  stage text not null default 'idea',
  location text,
  website text,
  funding_requirement integer default 0,
  market_info text,
  team jsonb not null default '[]'::jsonb,
  validation_score integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.startups to authenticated;
grant all on public.startups to service_role;

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.milestones to authenticated;
grant all on public.milestones to service_role;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  owner_id uuid not null,
  name text not null,
  storage_path text not null,
  doc_type text not null default 'pitch_deck',
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null,
  startup_id uuid references public.startups(id) on delete set null,
  problem_id uuid references public.problems(id) on delete set null,
  title text not null,
  description text,
  target_audience jsonb not null default '{}'::jsonb,
  status public.survey_status not null default 'draft',
  response_count integer not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
grant select, insert, update, delete on public.surveys to authenticated;
grant all on public.surveys to service_role;

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  position integer not null default 0,
  type text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default true
);
grant select, insert, update, delete on public.survey_questions to authenticated;
grant all on public.survey_questions to service_role;

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  respondent_id uuid not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (survey_id, respondent_id)
);
grant select, insert on public.survey_responses to authenticated;
grant all on public.survey_responses to service_role;

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  analysis_type text not null,
  result jsonb not null,
  provider text not null default 'demo',
  created_at timestamptz not null default now()
);
grant select on public.ai_analyses to authenticated;
grant all on public.ai_analyses to service_role;
create index ai_analyses_subject_idx on public.ai_analyses(subject_type, subject_id, analysis_type, created_at desc);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  recipient_id uuid not null,
  startup_id uuid references public.startups(id) on delete set null,
  status public.connection_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, recipient_id)
);
grant select, insert, update on public.connections to authenticated;
grant all on public.connections to service_role;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
create index messages_conn_idx on public.messages(connection_id, created_at);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status public.verification_status not null default 'pending',
  organization text,
  professional_reference text,
  notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.verification_records to authenticated;
grant all on public.verification_records to service_role;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

-- ============ HELPER FUNCTIONS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_verified_investor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.investor_profiles where user_id = _user_id and verification_status = 'verified')
$$;

create or replace function public.is_connected(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = _a and recipient_id = _b) or (requester_id = _b and recipient_id = _a))
  )
$$;

create or replace function public.is_blocked_between(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = _a and blocked_id = _b) or (blocker_id = _b and blocked_id = _a)
  )
$$;

create or replace function public.is_connection_participant(_conn uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.connections where id = _conn and (requester_id = _user or recipient_id = _user))
$$;

create or replace function public.can_view_survey(_survey uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.surveys where id = _survey and (status <> 'draft' or founder_id = _user))
$$;

create or replace function public.can_view_startup(_startup uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.startups where id = _startup and (is_public or founder_id = _user))
$$;

create or replace function public.startup_owner(_startup uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select founder_id from public.startups where id = _startup
$$;

create or replace function public.notify_user(_user uuid, _type text, _title text, _body text, _link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, type, title, body, link) values (_user, _type, _title, _body, _link);
end $$;

-- ============ TRIGGERS ============
create or replace function public.tg_vote_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.problems set upvote_count = upvote_count + 1 where id = new.problem_id;
    return new;
  else
    update public.problems set upvote_count = greatest(upvote_count - 1, 0) where id = old.problem_id;
    return old;
  end if;
end $$;
create trigger votes_count after insert or delete on public.votes for each row execute function public.tg_vote_count();

create or replace function public.tg_comment_count() returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_title text;
begin
  if tg_op = 'INSERT' then
    update public.problems set comment_count = comment_count + 1 where id = new.problem_id;
    select author_id, title into v_author, v_title from public.problems where id = new.problem_id;
    if v_author <> new.author_id then
      perform public.notify_user(v_author, 'comment', 'New comment on your problem', left(v_title, 80), '/problems/' || new.problem_id);
    end if;
    return new;
  else
    update public.problems set comment_count = greatest(comment_count - 1, 0) where id = old.problem_id;
    return old;
  end if;
end $$;
create trigger comments_count after insert or delete on public.comments for each row execute function public.tg_comment_count();

create or replace function public.tg_connection_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if tg_op = 'INSERT' then
    select full_name into v_name from public.profiles where id = new.requester_id;
    perform public.notify_user(new.recipient_id, 'connection_request', 'New connection request', coalesce(v_name,'Someone') || ' wants to connect with you', '/connections');
  elsif new.status <> old.status then
    select full_name into v_name from public.profiles where id = new.recipient_id;
    new.responded_at = now();
    if new.status = 'accepted' then
      perform public.notify_user(new.requester_id, 'connection_accepted', 'Connection accepted', coalesce(v_name,'Someone') || ' accepted your request. You can now message.', '/messages');
    end if;
  end if;
  return new;
end $$;
create trigger connections_notify_ins after insert on public.connections for each row execute function public.tg_connection_notify();
create trigger connections_notify_upd before update on public.connections for each row execute function public.tg_connection_notify();

create or replace function public.tg_survey_response() returns trigger language plpgsql security definer set search_path = public as $$
declare v_founder uuid; v_title text;
begin
  update public.surveys set response_count = response_count + 1 where id = new.survey_id returning founder_id, title into v_founder, v_title;
  perform public.notify_user(v_founder, 'survey_response', 'New survey response', v_title, '/surveys/' || new.survey_id);
  return new;
end $$;
create trigger survey_responses_notify after insert on public.survey_responses for each row execute function public.tg_survey_response();

create or replace function public.tg_survey_publish() returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = now();
    for r in select user_id from public.user_roles where role = 'general_user' limit 200 loop
      perform public.notify_user(r.user_id, 'survey_available', 'New survey available', new.title, '/surveys/' || new.id);
    end loop;
  end if;
  return new;
end $$;
create trigger surveys_publish before update on public.surveys for each row execute function public.tg_survey_publish();

create or replace function public.tg_verification_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.investor_profiles set verification_status = new.status where user_id = new.user_id;
  return new;
end $$;
create trigger verification_sync after insert or update on public.verification_records for each row execute function public.tg_verification_sync();

create or replace function public.tg_message_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_name text;
begin
  select case when requester_id = new.sender_id then recipient_id else requester_id end into v_other from public.connections where id = new.connection_id;
  select full_name into v_name from public.profiles where id = new.sender_id;
  if not exists (select 1 from public.notifications where user_id = v_other and type = 'message' and read_at is null and link = '/messages/' || new.connection_id) then
    perform public.notify_user(v_other, 'message', 'New message from ' || coalesce(v_name,'a connection'), left(new.body, 80), '/messages/' || new.connection_id);
  end if;
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.tg_message_notify();

-- ============ RLS ============
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select to authenticated using (is_public or id = auth.uid());
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

alter table public.profile_private enable row level security;
create policy "pp_own" on public.profile_private for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.user_roles enable row level security;
create policy "roles_select" on public.user_roles for select to authenticated using (true);

alter table public.founder_profiles enable row level security;
create policy "fp_select" on public.founder_profiles for select to authenticated using (true);
create policy "fp_insert" on public.founder_profiles for insert to authenticated with check (user_id = auth.uid() and public.has_role(auth.uid(),'founder'));
create policy "fp_update" on public.founder_profiles for update to authenticated using (user_id = auth.uid());

alter table public.investor_profiles enable row level security;
create policy "ip_select" on public.investor_profiles for select to authenticated using (true);
create policy "ip_insert" on public.investor_profiles for insert to authenticated with check (user_id = auth.uid() and public.has_role(auth.uid(),'investor'));
create policy "ip_update" on public.investor_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and verification_status = (select verification_status from public.investor_profiles p where p.user_id = auth.uid()));

alter table public.general_profiles enable row level security;
create policy "gp_select" on public.general_profiles for select to authenticated using (true);
create policy "gp_insert" on public.general_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "gp_update" on public.general_profiles for update to authenticated using (user_id = auth.uid());

alter table public.consents enable row level security;
create policy "consents_own" on public.consents for select to authenticated using (user_id = auth.uid());
create policy "consents_ins" on public.consents for insert to authenticated with check (user_id = auth.uid());

alter table public.problems enable row level security;
create policy "problems_select" on public.problems for select to authenticated using (true);
create policy "problems_insert" on public.problems for insert to authenticated with check (author_id = auth.uid() and (public.has_role(auth.uid(),'general_user') or public.has_role(auth.uid(),'founder')));
create policy "problems_update" on public.problems for update to authenticated using (author_id = auth.uid());
create policy "problems_delete" on public.problems for delete to authenticated using (author_id = auth.uid());

alter table public.comments enable row level security;
create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "comments_delete" on public.comments for delete to authenticated using (author_id = auth.uid());

alter table public.votes enable row level security;
create policy "votes_select" on public.votes for select to authenticated using (true);
create policy "votes_insert" on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "votes_delete" on public.votes for delete to authenticated using (user_id = auth.uid());

alter table public.saved_items enable row level security;
create policy "saved_own" on public.saved_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.topic_follows enable row level security;
create policy "follows_own" on public.topic_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.startups enable row level security;
create policy "startups_select" on public.startups for select to authenticated using (is_public or founder_id = auth.uid());
create policy "startups_insert" on public.startups for insert to authenticated with check (founder_id = auth.uid() and public.has_role(auth.uid(),'founder'));
create policy "startups_update" on public.startups for update to authenticated using (founder_id = auth.uid());
create policy "startups_delete" on public.startups for delete to authenticated using (founder_id = auth.uid());

alter table public.milestones enable row level security;
create policy "ms_select" on public.milestones for select to authenticated using (public.can_view_startup(startup_id, auth.uid()));
create policy "ms_write" on public.milestones for all to authenticated using (public.startup_owner(startup_id) = auth.uid()) with check (public.startup_owner(startup_id) = auth.uid());

alter table public.documents enable row level security;
create policy "docs_select" on public.documents for select to authenticated using (
  owner_id = auth.uid()
  or (not is_private and public.can_view_startup(startup_id, auth.uid()))
  or (public.is_verified_investor(auth.uid()) and public.is_connected(auth.uid(), owner_id))
);
create policy "docs_write" on public.documents for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.startup_owner(startup_id) = auth.uid());

alter table public.surveys enable row level security;
create policy "surveys_select" on public.surveys for select to authenticated using (status <> 'draft' or founder_id = auth.uid());
create policy "surveys_insert" on public.surveys for insert to authenticated with check (founder_id = auth.uid() and public.has_role(auth.uid(),'founder'));
create policy "surveys_update" on public.surveys for update to authenticated using (founder_id = auth.uid());
create policy "surveys_delete" on public.surveys for delete to authenticated using (founder_id = auth.uid());

alter table public.survey_questions enable row level security;
create policy "sq_select" on public.survey_questions for select to authenticated using (public.can_view_survey(survey_id, auth.uid()));
create policy "sq_write" on public.survey_questions for all to authenticated using ((select founder_id from public.surveys s where s.id = survey_id) = auth.uid()) with check ((select founder_id from public.surveys s where s.id = survey_id) = auth.uid());

alter table public.survey_responses enable row level security;
create policy "sr_select" on public.survey_responses for select to authenticated using (respondent_id = auth.uid() or (select founder_id from public.surveys s where s.id = survey_id) = auth.uid());
create policy "sr_insert" on public.survey_responses for insert to authenticated with check (respondent_id = auth.uid() and exists (select 1 from public.surveys s where s.id = survey_id and s.status = 'published' and s.founder_id <> auth.uid()));

alter table public.ai_analyses enable row level security;
create policy "ai_select" on public.ai_analyses for select to authenticated using (true);

alter table public.connections enable row level security;
create policy "conn_select" on public.connections for select to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());
create policy "conn_insert" on public.connections for insert to authenticated with check (requester_id = auth.uid() and requester_id <> recipient_id and not public.is_blocked_between(requester_id, recipient_id) and (public.has_role(auth.uid(),'founder') or public.has_role(auth.uid(),'investor')));
create policy "conn_update" on public.connections for update to authenticated using (recipient_id = auth.uid() and status = 'pending');

alter table public.messages enable row level security;
create policy "msg_select" on public.messages for select to authenticated using (public.is_connection_participant(connection_id, auth.uid()));
create policy "msg_insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.connections c where c.id = connection_id and c.status = 'accepted' and (c.requester_id = auth.uid() or c.recipient_id = auth.uid()) and not public.is_blocked_between(c.requester_id, c.recipient_id))
  and length(body) between 1 and 2000
);
create policy "msg_update" on public.messages for update to authenticated using (public.is_connection_participant(connection_id, auth.uid()) and sender_id <> auth.uid());

alter table public.blocks enable row level security;
create policy "blocks_own" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

alter table public.notifications enable row level security;
create policy "notif_select" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif_update" on public.notifications for update to authenticated using (user_id = auth.uid());

alter table public.reports enable row level security;
create policy "reports_select" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'moderator'));
create policy "reports_insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_update" on public.reports for update to authenticated using (public.has_role(auth.uid(),'moderator'));

alter table public.verification_records enable row level security;
create policy "vr_own" on public.verification_records for select to authenticated using (user_id = auth.uid());
create policy "vr_ins" on public.verification_records for insert to authenticated with check (user_id = auth.uid() and public.has_role(auth.uid(),'investor'));
create policy "vr_upd" on public.verification_records for update to authenticated using (user_id = auth.uid());

alter table public.audit_logs enable row level security;
create policy "audit_own" on public.audit_logs for select to authenticated using (user_id = auth.uid());
create policy "audit_ins" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

-- Realtime for messages + notifications
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;