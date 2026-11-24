-- Optional, rerunnable illustrative startup data for the existing demo founder accounts.
-- Run AFTER scripts/seed-demo-data.sql (needs the demo founder profiles and problems 1-12).
-- Stable IDs plus the name/owner guard prevent duplicate demo rows without updating existing records.
-- Demo founder #4 owns two of the startups below but is not part of the original seed.
-- Idempotent: safe whether or not the base demo data came from migration 0001 or scripts/seed-demo-data.sql.
INSERT INTO public.profiles (id, full_name, bio, location, is_public)
VALUES ('11111111-1111-4111-8111-000000000004', 'Ananya Rao', 'Founder exploring education technology for under-resourced classrooms. Demo account.', 'Bhopal, India', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
VALUES ('11111111-1111-4111-8111-000000000004', 'founder')
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.founder_profiles (user_id, skills, industry, industry_interests, startup_experience, linkedin_url, startup_status)
VALUES ('11111111-1111-4111-8111-000000000004', '{Education,Design,Operations}', 'Education', '{Education,SaaS}', 'First-time founder', 'https://linkedin.com/in/demo-ananya', 'validating')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.startups (
  id, founder_id, name, tagline, problem_id, problem, solution, description,
  industry, business_model, target_users, stage, location, funding_requirement,
  market_info, team, validation_score, is_public
)
SELECT
  demo.id, demo.founder_id, demo.name, demo.tagline, demo.problem_id, demo.problem,
  demo.solution, demo.description, demo.industry, demo.business_model, demo.target_users,
  demo.stage, demo.location, demo.funding_requirement, demo.market_info, demo.team,
  demo.validation_score, true
FROM (VALUES
  (
    'bbbb0000-0000-4000-8000-000000000008'::uuid,
    '11111111-1111-4111-8111-000000000001'::uuid,
    'LedgerNest', 'Simple digital khata tools for neighborhood shops',
    'aaaa0000-0000-4000-8000-000000000006'::uuid,
    'Small shops often track customer credit in paper notebooks.',
    'A lightweight shop ledger concept with reminders and a clear balance history.',
    'Illustrative demo startup. The concept explores easier credit-record keeping for neighborhood retailers; no customer or usage claims are made.',
    'Fintech', 'Illustrative subscription plan for small retailers', 'Neighborhood shops and their regular customers',
    'mvp', 'Jaipur, India', 6500000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo product lead","role":"Product"}]'::jsonb, 63
  ),
  (
    'bbbb0000-0000-4000-8000-000000000009'::uuid,
    '11111111-1111-4111-8111-000000000004'::uuid,
    'ClassOrbit', 'Regional lesson planning for resource-limited classrooms',
    'aaaa0000-0000-4000-8000-000000000008'::uuid,
    'Teachers may spend significant time preparing accessible digital lesson material.',
    'An offline-first lesson-planning concept with adaptable worksheets and local-language prompts.',
    'Illustrative demo startup. The concept is designed for school staff with intermittent connectivity; it does not represent a live deployment.',
    'Education', 'Illustrative school or district subscription', 'Teachers and school administrators',
    'prototype', 'Bhopal, India', 4800000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo learning designer","role":"Learning design"}]'::jsonb, 57
  ),
  (
    'bbbb0000-0000-4000-8000-000000000010'::uuid,
    '11111111-1111-4111-8111-000000000002'::uuid,
    'ReLoop Local', 'A neighborhood guide to responsible e-waste handoff',
    'aaaa0000-0000-4000-8000-000000000007'::uuid,
    'Households can find it difficult to identify a convenient route for disposing of e-waste.',
    'A directory and pickup-coordination concept for local e-waste collection options.',
    'Illustrative demo startup. Collection locations and partners are not represented as verified or active.',
    'Sustainability', 'Illustrative fee per coordinated collection', 'Households and community collection groups',
    'idea', 'Kochi, India', 3200000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo operations lead","role":"Operations"}]'::jsonb, 48
  ),
  (
    'bbbb0000-0000-4000-8000-000000000011'::uuid,
    '11111111-1111-4111-8111-000000000003'::uuid,
    'NookMap', 'A clearer way to compare student rental options',
    'aaaa0000-0000-4000-8000-000000000004'::uuid,
    'Students can struggle to compare affordable accommodation options near campus.',
    'A rental comparison concept for organizing budgets, commute notes, and viewing questions.',
    'Illustrative demo startup. Listings and accommodations are not represented as verified or available.',
    'Housing', 'Illustrative listing tools for student communities', 'College students and student housing groups',
    'prototype', 'Pune, India', 4100000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo community lead","role":"Community"}]'::jsonb, 54
  ),
  (
    'bbbb0000-0000-4000-8000-000000000012'::uuid,
    '11111111-1111-4111-8111-000000000002'::uuid,
    'CargoPebble', 'Shared pickup planning for small local sellers',
    'aaaa0000-0000-4000-8000-000000000010'::uuid,
    'Small produce sellers may find temperature-aware transport difficult to coordinate.',
    'A shared-load planning concept to group nearby pickup requests for local carriers.',
    'Illustrative demo startup. No carrier network, delivery volume, or customer relationship is claimed.',
    'Logistics', 'Illustrative coordination fee per shipment', 'Small produce sellers and local carriers',
    'mvp', 'Nashik, India', 7200000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo logistics planner","role":"Operations"}]'::jsonb, 61
  ),
  (
    'bbbb0000-0000-4000-8000-000000000013'::uuid,
    '11111111-1111-4111-8111-000000000001'::uuid,
    'CarePatch', 'Post-care check-in planning for families and clinics',
    'aaaa0000-0000-4000-8000-000000000011'::uuid,
    'Families may find it hard to coordinate follow-up care after a patient returns home.',
    'A care-plan reminder concept for organizing follow-up tasks and family check-ins.',
    'Illustrative demo startup. It is not a medical provider and makes no clinical outcome claims.',
    'Healthcare', 'Illustrative clinic software subscription', 'Families and outpatient care teams',
    'idea', 'Mysuru, India', 2800000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo care coordinator","role":"Care operations"}]'::jsonb, 52
  ),
  (
    'bbbb0000-0000-4000-8000-000000000014'::uuid,
    '11111111-1111-4111-8111-000000000003'::uuid,
    'ShiftRide', 'Plan safer late-shift journeys with clearer options',
    'aaaa0000-0000-4000-8000-000000000003'::uuid,
    'Workers finishing late shifts may have limited transport choices for the journey home.',
    'A route-planning concept that helps teams coordinate shared rides and pickup windows.',
    'Illustrative demo startup. No transport operator partnership or safety certification is claimed.',
    'Transportation', 'Illustrative employer or team subscription', 'Shift workers and workplace coordinators',
    'prototype', 'Hyderabad, India', 8500000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo mobility planner","role":"Product"}]'::jsonb, 66
  ),
  (
    'bbbb0000-0000-4000-8000-000000000015'::uuid,
    '11111111-1111-4111-8111-000000000002'::uuid,
    'MandiMap', 'Organize local crop price notes in one place',
    'aaaa0000-0000-4000-8000-000000000002'::uuid,
    'Small farmers may have limited access to timely produce price information.',
    'A simple market-note concept for comparing reported prices and planning market visits.',
    'Illustrative demo startup. Price information is a product concept, not a live quote or verified data feed.',
    'Agriculture', 'Illustrative cooperative or buyer subscription', 'Small farmers and farmer groups',
    'prototype', 'Nagpur, India', 3600000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo agriculture researcher","role":"Research"}]'::jsonb, 59
  ),
  (
    'bbbb0000-0000-4000-8000-000000000016'::uuid,
    '11111111-1111-4111-8111-000000000004'::uuid,
    'SocioSync', 'Make shared apartment tasks easier to coordinate',
    'aaaa0000-0000-4000-8000-000000000009'::uuid,
    'Apartment communities may rely on scattered messages for shared building tasks.',
    'A resident coordination concept for notices, maintenance requests, and delivery updates.',
    'Illustrative demo startup. No residential society has adopted or endorsed the concept.',
    'Consumer', 'Illustrative per-community subscription', 'Apartment residents and community coordinators',
    'idea', 'Surat, India', 2400000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo service designer","role":"Service design"}]'::jsonb, 46
  ),
  (
    'bbbb0000-0000-4000-8000-000000000017'::uuid,
    '11111111-1111-4111-8111-000000000001'::uuid,
    'StudioFlow', 'Keep small creative teams aligned on project handoffs',
    NULL::uuid,
    'Small creative teams can lose time coordinating project files and review steps across tools.',
    'A lightweight workspace concept for project briefs, review notes, and handoff checklists.',
    'Illustrative demo startup. This profile is a product concept, not a claim of active customers or usage.',
    'SaaS', 'Illustrative per-seat software subscription', 'Independent studios and small creative teams',
    'mvp', 'Chennai, India', 11000000,
    'Illustrative demo assumption only; no market-size estimate is included.',
    '[{"name":"Demo workflow designer","role":"Product"}]'::jsonb, 71
  )
) AS demo (
  id, founder_id, name, tagline, problem_id, problem, solution, description,
  industry, business_model, target_users, stage, location, funding_requirement,
  market_info, team, validation_score
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.startups AS existing
  WHERE existing.id = demo.id
     OR (existing.founder_id = demo.founder_id AND lower(existing.name) = lower(demo.name))
)
ON CONFLICT (id) DO NOTHING;