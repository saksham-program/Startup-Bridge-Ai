-- Demo users (auth accounts are provisioned for the three demo logins by the app; these ids are fixed)
insert into public.profiles (id, full_name, avatar_url, bio, location, is_public) values
('11111111-1111-4111-8111-000000000001','Karan Mehta',null,'Second-time founder building in healthtech. Ex-product lead at a diagnostics startup. Demo account.','Bengaluru, India',true),
('11111111-1111-4111-8111-000000000002','Priya Sharma',null,'Founder focused on agritech and rural supply chains. Demo account.','Pune, India',true),
('11111111-1111-4111-8111-000000000003','Rahul Verma',null,'Engineer-turned-founder working on urban mobility. Demo account.','Delhi, India',true),
('22222222-2222-4222-8222-000000000001','Neha Kapoor',null,'Angel investor backing early-stage consumer and health startups in India. Demo account.','Mumbai, India',true),
('22222222-2222-4222-8222-000000000002','Aarav Shah (Aarav Capital)',null,'Partner at Aarav Capital, a seed fund investing in fintech and SaaS. Demo account.','Mumbai, India',true),
('22222222-2222-4222-8222-000000000003','Meera Iyer (Demo Ventures)',null,'Principal at Demo Ventures. Sector-agnostic pre-seed investing. Demo account.','Bengaluru, India',true),
('22222222-2222-4222-8222-000000000004','Vikram Sethi',null,'Operator-angel with exits in logistics. Demo account.','Gurugram, India',true),
('22222222-2222-4222-8222-000000000005','Riya Malhotra',null,'Climate and agritech investor. Demo account.','Hyderabad, India',true),
('33333333-3333-4333-8333-000000000001','Demo User 1',null,'Curious citizen who likes sharing everyday problems. Demo account.','Bengaluru, India',true),
('33333333-3333-4333-8333-000000000002','Demo User 2',null,'College student and survey enthusiast. Demo account.','Chennai, India',true);

insert into public.user_roles (user_id, role) values
('11111111-1111-4111-8111-000000000001','founder'),
('11111111-1111-4111-8111-000000000001','moderator'),
('11111111-1111-4111-8111-000000000002','founder'),
('11111111-1111-4111-8111-000000000003','founder'),
('22222222-2222-4222-8222-000000000001','investor'),
('22222222-2222-4222-8222-000000000002','investor'),
('22222222-2222-4222-8222-000000000003','investor'),
('22222222-2222-4222-8222-000000000004','investor'),
('22222222-2222-4222-8222-000000000005','investor'),
('33333333-3333-4333-8333-000000000001','general_user'),
('33333333-3333-4333-8333-000000000002','general_user');

insert into public.founder_profiles (user_id, skills, industry, industry_interests, startup_experience, linkedin_url, startup_status) values
('11111111-1111-4111-8111-000000000001','{Product,Healthcare,Go-to-market}','Healthcare','{Healthcare,Consumer}','Second-time founder','https://linkedin.com/in/demo-karan','building'),
('11111111-1111-4111-8111-000000000002','{Operations,Supply chain,Sales}','Agriculture','{Agriculture,Logistics}','First-time founder','https://linkedin.com/in/demo-priya','validating'),
('11111111-1111-4111-8111-000000000003','{Engineering,Data,Mobility}','Transportation','{Transportation,Sustainability}','First-time founder','https://linkedin.com/in/demo-rahul','building');

insert into public.investor_profiles (user_id, investor_type, investment_interests, preferred_industries, preferred_stages, investment_min, investment_max, firm_name, professional_profile, website, verification_status) values
('22222222-2222-4222-8222-000000000001','Angel','{Consumer,Healthcare}','{Healthcare,Consumer,Education}','{idea,prototype,mvp}',500000,5000000,'Independent','https://linkedin.com/in/demo-neha','https://example.com/neha','verified'),
('22222222-2222-4222-8222-000000000002','Seed Fund','{Fintech,SaaS}','{Fintech,SaaS,Healthcare}','{mvp,early_traction}',5000000,30000000,'Aarav Capital','https://linkedin.com/in/demo-aarav','https://example.com/aarav','verified'),
('22222222-2222-4222-8222-000000000003','Pre-seed Fund','{Sector agnostic}','{Agriculture,Transportation,Healthcare,Education}','{idea,prototype,mvp}',1000000,10000000,'Demo Ventures','https://linkedin.com/in/demo-meera','https://example.com/demo-ventures','under_review'),
('22222222-2222-4222-8222-000000000004','Angel','{Logistics,Mobility}','{Transportation,Logistics}','{prototype,mvp,early_traction}',1000000,8000000,'Independent','https://linkedin.com/in/demo-vikram',null,'pending'),
('22222222-2222-4222-8222-000000000005','Angel','{Climate,Agritech}','{Agriculture,Sustainability}','{idea,prototype,mvp}',500000,4000000,'Independent','https://linkedin.com/in/demo-riya',null,'verified');

insert into public.general_profiles (user_id, interests) values
('33333333-3333-4333-8333-000000000001','{Healthcare,Transportation,Consumer}'),
('33333333-3333-4333-8333-000000000002','{Education,Agriculture,Sustainability}');

insert into public.verification_records (user_id, status, organization, professional_reference, notes, submitted_at, reviewed_at) values
('22222222-2222-4222-8222-000000000001','verified','Independent','Demo reference','Demo verification – approved for prototype', now() - interval '20 days', now() - interval '18 days'),
('22222222-2222-4222-8222-000000000002','verified','Aarav Capital','Demo reference','Demo verification – approved for prototype', now() - interval '30 days', now() - interval '27 days'),
('22222222-2222-4222-8222-000000000003','under_review','Demo Ventures','Demo reference','Submitted, awaiting demo review', now() - interval '3 days', null),
('22222222-2222-4222-8222-000000000005','verified','Independent','Demo reference','Demo verification – approved for prototype', now() - interval '10 days', now() - interval '9 days');

-- Problems
insert into public.problems (id, author_id, title, description, category, location, who_faces, frequency, tags, upvote_count, comment_count, created_at) values
('aaaa0000-0000-4000-8000-000000000001','33333333-3333-4333-8333-000000000001','Long waiting times at government hospital OPDs','Patients wait 3–5 hours for a 5-minute OPD consultation. No way to know queue position or book a slot in advance. Elderly patients suffer the most.','Healthcare','Bengaluru, India','Patients, elderly, caregivers','Daily','{hospital,queue,opd,appointments}',0,0, now() - interval '25 days'),
('aaaa0000-0000-4000-8000-000000000002','33333333-3333-4333-8333-000000000002','Small farmers cannot find fair prices for produce','Farmers in my village sell to middlemen at 40% below market rate because they have no visibility into mandi prices or direct buyers.','Agriculture','Maharashtra, India','Small and marginal farmers','Weekly','{farmers,pricing,mandi,middlemen}',0,0, now() - interval '22 days'),
('aaaa0000-0000-4000-8000-000000000003','33333333-3333-4333-8333-000000000001','Last-mile commute from metro stations is unreliable','Auto drivers refuse short trips or overcharge. Shared options are unpredictable in the evening.','Transportation','Delhi, India','Daily commuters, office workers','Daily','{metro,last-mile,auto,commute}',0,0, now() - interval '20 days'),
('aaaa0000-0000-4000-8000-000000000004','33333333-3333-4333-8333-000000000002','College students struggle to find affordable verified PG accommodation','Listings are outdated, brokers charge a month''s rent, and there is no way to verify safety or actual photos.','Housing','Chennai, India','Students, young professionals','Monthly','{housing,students,pg,brokers}',0,0, now() - interval '18 days'),
('aaaa0000-0000-4000-8000-000000000005','33333333-3333-4333-8333-000000000001','Medicine reminders fail for elderly living alone','My grandmother forgets her BP medicines. Phone alarms are ignored. Family lives in another city and cannot check.','Healthcare','Bengaluru, India','Elderly, families','Daily','{elderly,medication,adherence,caregivers}',0,0, now() - interval '16 days'),
('aaaa0000-0000-4000-8000-000000000006','33333333-3333-4333-8333-000000000002','Small shops cannot manage credit (udhaar) from customers','Kirana owners keep credit in notebooks, lose track, and struggle to collect. Existing apps are too complex.','Fintech','Pune, India','Kirana store owners','Daily','{kirana,credit,sme,bookkeeping}',0,0, now() - interval '14 days'),
('aaaa0000-0000-4000-8000-000000000007','33333333-3333-4333-8333-000000000001','Household e-waste has no easy disposal route','Old phones, chargers and batteries pile up at home. Nobody knows where to give them safely.','Sustainability','Hyderabad, India','Urban households','Monthly','{e-waste,recycling,sustainability}',0,0, now() - interval '12 days'),
('aaaa0000-0000-4000-8000-000000000008','33333333-3333-4333-8333-000000000002','Tier-2 students lack access to quality English speaking practice','Students can read English but freeze while speaking. Coaching is expensive and rare outside cities.','Education','Lucknow, India','Students, job seekers','Weekly','{education,english,speaking,tier2}',0,0, now() - interval '10 days'),
('aaaa0000-0000-4000-8000-000000000009','33333333-3333-4333-8333-000000000001','Apartment societies struggle with visitor and delivery management','Security guards use paper registers. Deliveries get lost and residents get repeated calls.','Consumer','Gurugram, India','Apartment residents, security staff','Daily','{society,visitors,delivery,security}',0,0, now() - interval '9 days'),
('aaaa0000-0000-4000-8000-000000000010','33333333-3333-4333-8333-000000000002','Cold-chain gaps spoil vegetables before reaching cities','Produce loses 20–30% value in transit due to no refrigeration for small loads.','Agriculture','Nashik, India','Farmers, aggregators','Weekly','{cold-chain,logistics,agri,wastage}',0,0, now() - interval '7 days'),
('aaaa0000-0000-4000-8000-000000000011','33333333-3333-4333-8333-000000000001','Finding a trustworthy home nurse for post-surgery care is hard','Agencies are opaque about training and pricing. Families rely on word of mouth.','Healthcare','Mumbai, India','Patients recovering at home, families','Monthly','{homecare,nursing,healthcare,trust}',0,0, now() - interval '5 days'),
('aaaa0000-0000-4000-8000-000000000012','33333333-3333-4333-8333-000000000002','Gig delivery workers have no income protection on bad-weather days','Rain days mean zero income and no insurance. Platforms do not compensate.','Fintech','Chennai, India','Gig delivery workers','Weekly','{gig,insurance,income,workers}',0,0, now() - interval '3 days');

insert into public.votes (user_id, problem_id) values
('33333333-3333-4333-8333-000000000002','aaaa0000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-000000000001','aaaa0000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-000000000002','aaaa0000-0000-4000-8000-000000000001'),
('22222222-2222-4222-8222-000000000001','aaaa0000-0000-4000-8000-000000000001'),
('33333333-3333-4333-8333-000000000001','aaaa0000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-000000000002','aaaa0000-0000-4000-8000-000000000002'),
('22222222-2222-4222-8222-000000000005','aaaa0000-0000-4000-8000-000000000002'),
('33333333-3333-4333-8333-000000000002','aaaa0000-0000-4000-8000-000000000003'),
('11111111-1111-4111-8111-000000000003','aaaa0000-0000-4000-8000-000000000003'),
('33333333-3333-4333-8333-000000000001','aaaa0000-0000-4000-8000-000000000004'),
('33333333-3333-4333-8333-000000000002','aaaa0000-0000-4000-8000-000000000005'),
('11111111-1111-4111-8111-000000000001','aaaa0000-0000-4000-8000-000000000005'),
('22222222-2222-4222-8222-000000000001','aaaa0000-0000-4000-8000-000000000005'),
('33333333-3333-4333-8333-000000000001','aaaa0000-0000-4000-8000-000000000006'),
('22222222-2222-4222-8222-000000000002','aaaa0000-0000-4000-8000-000000000006'),
('33333333-3333-4333-8333-000000000002','aaaa0000-0000-4000-8000-000000000007'),
('33333333-3333-4333-8333-000000000001','aaaa0000-0000-4000-8000-000000000008'),
('33333333-3333-4333-8333-000000000002','aaaa0000-0000-4000-8000-000000000011'),
('11111111-1111-4111-8111-000000000001','aaaa0000-0000-4000-8000-000000000011');

insert into public.comments (problem_id, author_id, body, created_at) values
('aaaa0000-0000-4000-8000-000000000001','33333333-3333-4333-8333-000000000002','Same in Chennai GH. Even a simple SMS token system would help.', now() - interval '24 days'),
('aaaa0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','Working on exactly this. Would love more inputs on which hospitals you visit.', now() - interval '23 days'),
('aaaa0000-0000-4000-8000-000000000002','11111111-1111-4111-8111-000000000002','Have you seen any price-discovery apps in your area? Curious what failed.', now() - interval '21 days'),
('aaaa0000-0000-4000-8000-000000000003','33333333-3333-4333-8333-000000000001','Evening 7–9 pm is the worst window at Rajiv Chowk.', now() - interval '19 days'),
('aaaa0000-0000-4000-8000-000000000005','33333333-3333-4333-8333-000000000002','A simple call-based reminder in local language could work better than an app.', now() - interval '15 days'),
('aaaa0000-0000-4000-8000-000000000006','22222222-2222-4222-8222-000000000002','Strong space. Distribution is the hard part.', now() - interval '13 days');

-- Startups
insert into public.startups (id, founder_id, name, tagline, problem_id, problem, solution, description, industry, business_model, target_users, stage, location, website, funding_requirement, market_info, team, validation_score, created_at) values
('bbbb0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','QueueCare','Skip the OPD queue, not the care','aaaa0000-0000-4000-8000-000000000001','Patients wait hours at public hospital OPDs with no visibility into queue status.','A lightweight SMS + web token system for OPDs that lets patients book slots, see live queue position and get notified before their turn.','QueueCare integrates with hospital front desks with zero hardware. Patients without smartphones use SMS; hospitals get a simple dashboard.','Healthcare','B2B2C SaaS – per-hospital subscription with a government partnership track','Public hospital patients and OPD administrators','mvp','Bengaluru, India','https://queuecare.example.com',8000000,'India has 25,000+ public hospitals; OPD footfall exceeds 1.3 billion visits a year (AI-based indication, not verified market research).','[{"name":"Karan Mehta","role":"CEO & Product"},{"name":"Sneha Rao","role":"CTO"}]',72, now() - interval '20 days'),
('bbbb0000-0000-4000-8000-000000000002','11111111-1111-4111-8111-000000000001','PillPal','Medicine adherence for elderly parents','aaaa0000-0000-4000-8000-000000000005','Elderly people living alone forget critical medication; remote families cannot monitor.','Automated voice-call reminders in local languages with a family dashboard showing confirmations.','PillPal works on any phone. Confirmation via keypad. Family receives alerts when a dose is missed.','Healthcare','B2C subscription paid by families','Families with elderly parents','prototype','Bengaluru, India',null,3000000,'Ageing population in India projected to reach 300M+ by 2050 (indicative).','[{"name":"Karan Mehta","role":"Founder"}]',58, now() - interval '12 days'),
('bbbb0000-0000-4000-8000-000000000003','11111111-1111-4111-8111-000000000002','FarmLink','Direct market access for small farmers','aaaa0000-0000-4000-8000-000000000002','Small farmers sell to middlemen at steep discounts because they lack price visibility and buyers.','A WhatsApp-first marketplace showing daily mandi prices and connecting farmer groups directly with bulk buyers.','FarmLink aggregates produce at village level and coordinates pickup with verified buyers.','Agriculture','Commission on transactions + premium buyer subscriptions','Small farmers, FPOs, bulk buyers','early_traction','Pune, India','https://farmlink.example.com',15000000,'Indian agri output ~USD 400B; FPO count growing rapidly (indicative).','[{"name":"Priya Sharma","role":"CEO"},{"name":"Amol Patil","role":"Operations"},{"name":"Dev Nair","role":"Engineering"}]',81, now() - interval '18 days'),
('bbbb0000-0000-4000-8000-000000000004','11111111-1111-4111-8111-000000000002','ColdMile','Shared cold-chain for small produce loads','aaaa0000-0000-4000-8000-000000000010','Produce spoils in transit because small loads cannot afford refrigeration.','Shared refrigerated micro-hubs and pooled reefer trips booked via app.','ColdMile pools loads from several farmers into one refrigerated trip.','Agriculture','Per-crate logistics fee','Farmers, aggregators, city retailers','idea','Nashik, India',null,5000000,'Post-harvest losses estimated at 20–30% for perishables (indicative).','[{"name":"Priya Sharma","role":"Founder"}]',44, now() - interval '6 days'),
('bbbb0000-0000-4000-8000-000000000005','11111111-1111-4111-8111-000000000003','MetroHop','Reliable last-mile from every metro station','aaaa0000-0000-4000-8000-000000000003','Last-mile from metro stations is unreliable and overpriced.','Fixed-price shared e-rickshaw shuttles on dynamic loops from metro exits, bookable in one tap.','MetroHop partners with e-rickshaw fleets and metro authorities to run predictable loops.','Transportation','Per-ride fee + fleet SaaS','Daily metro commuters','mvp','Delhi, India','https://metrohop.example.com',12000000,'Delhi Metro carries 6M+ daily riders (indicative).','[{"name":"Rahul Verma","role":"CEO"},{"name":"Isha Bansal","role":"Ops"}]',67, now() - interval '15 days'),
('bbbb0000-0000-4000-8000-000000000006','11111111-1111-4111-8111-000000000003','GateBook','Paperless visitor & delivery management for societies','aaaa0000-0000-4000-8000-000000000009','Society security uses paper registers; deliveries get lost.','A simple guard app + resident approvals over WhatsApp, no resident app install required.','GateBook targets mid-size societies that find existing solutions too expensive.','Consumer','Per-flat monthly subscription','Apartment societies','prototype','Gurugram, India',null,4000000,'Over 500k gated societies in India (indicative).','[{"name":"Rahul Verma","role":"Founder"}]',51, now() - interval '8 days');

insert into public.milestones (startup_id, title, description, due_date, status) values
('bbbb0000-0000-4000-8000-000000000001','Pilot at 2 hospitals','Run a 4-week pilot in two OPDs', current_date + 30, 'in_progress'),
('bbbb0000-0000-4000-8000-000000000001','SMS gateway integration','Complete DLT registration and gateway integration', current_date - 10, 'done'),
('bbbb0000-0000-4000-8000-000000000001','Government partnership MoU','Sign MoU with state health department', current_date + 90, 'planned'),
('bbbb0000-0000-4000-8000-000000000003','Onboard 500 farmers','Reach 500 active farmers across 3 districts', current_date + 45, 'in_progress'),
('bbbb0000-0000-4000-8000-000000000003','First 10 bulk buyers','Verified buyer network live', current_date - 20, 'done'),
('bbbb0000-0000-4000-8000-000000000005','Launch 3 station loops','Live at Rajiv Chowk, Hauz Khas, Dwarka', current_date + 20, 'in_progress');

insert into public.documents (startup_id, owner_id, name, storage_path, doc_type, is_private) values
('bbbb0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','QueueCare Pitch Deck (demo)','demo/queuecare-deck.pdf','pitch_deck',true),
('bbbb0000-0000-4000-8000-000000000003','11111111-1111-4111-8111-000000000002','FarmLink Pitch Deck (demo)','demo/farmlink-deck.pdf','pitch_deck',true),
('bbbb0000-0000-4000-8000-000000000005','11111111-1111-4111-8111-000000000003','MetroHop One-pager (demo)','demo/metrohop-onepager.pdf','one_pager',false);

-- Surveys
insert into public.surveys (id, founder_id, startup_id, problem_id, title, description, target_audience, status, response_count, created_at, published_at) values
('cccc0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','bbbb0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001','Would you use an SMS token system for hospital OPDs?','Help us validate QueueCare. Takes 2 minutes.','{"age_range":"18-65","location":"India","interests":["Healthcare"],"category":"Healthcare"}','published',0, now() - interval '15 days', now() - interval '15 days'),
('cccc0000-0000-4000-8000-000000000002','11111111-1111-4111-8111-000000000002','bbbb0000-0000-4000-8000-000000000003','aaaa0000-0000-4000-8000-000000000002','Farmer price discovery survey','Tell us how you currently decide where to sell produce.','{"age_range":"18-70","location":"Maharashtra","interests":["Agriculture"],"category":"Agriculture"}','published',0, now() - interval '12 days', now() - interval '12 days'),
('cccc0000-0000-4000-8000-000000000003','11111111-1111-4111-8111-000000000003','bbbb0000-0000-4000-8000-000000000005','aaaa0000-0000-4000-8000-000000000003','Metro last-mile shuttle interest','Would you pay a fixed price for a shared shuttle from your metro station?','{"age_range":"18-45","location":"Delhi","interests":["Transportation"],"category":"Transportation"}','published',0, now() - interval '8 days', now() - interval '8 days'),
('cccc0000-0000-4000-8000-000000000004','11111111-1111-4111-8111-000000000001','bbbb0000-0000-4000-8000-000000000002',null,'PillPal voice reminder concept test','Draft – not yet published.','{"age_range":"25-55","location":"India","interests":["Healthcare"],"category":"Healthcare"}','draft',0, now() - interval '2 days', null);

insert into public.survey_questions (id, survey_id, position, type, prompt, options, required) values
('dddd0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001',0,'single_choice','How often do you or your family visit a government hospital OPD?','["Weekly","Monthly","A few times a year","Rarely"]',true),
('dddd0000-0000-4000-8000-000000000002','cccc0000-0000-4000-8000-000000000001',1,'rating','How painful is the current waiting experience? (1 = fine, 5 = very painful)','[]',true),
('dddd0000-0000-4000-8000-000000000003','cccc0000-0000-4000-8000-000000000001',2,'yes_no','Would you use an SMS-based token that tells you your queue position?','[]',true),
('dddd0000-0000-4000-8000-000000000004','cccc0000-0000-4000-8000-000000000001',3,'multiple_choice','Which features matter most?','["Book a slot in advance","Live queue position","Reminder before my turn","Works without smartphone"]',false),
('dddd0000-0000-4000-8000-000000000005','cccc0000-0000-4000-8000-000000000001',4,'long_answer','What concerns would stop you from using this?','[]',false),
('dddd0000-0000-4000-8000-000000000006','cccc0000-0000-4000-8000-000000000002',0,'single_choice','How do you currently learn the selling price?','["Middleman tells me","Neighbours","Newspaper/TV","Mobile app"]',true),
('dddd0000-0000-4000-8000-000000000007','cccc0000-0000-4000-8000-000000000002',1,'yes_no','Would you sell directly to a verified bulk buyer if pickup was arranged?','[]',true),
('dddd0000-0000-4000-8000-000000000008','cccc0000-0000-4000-8000-000000000002',2,'rating','How much do you trust mobile apps for payments? (1–5)','[]',true),
('dddd0000-0000-4000-8000-000000000009','cccc0000-0000-4000-8000-000000000002',3,'short_answer','What is your biggest worry about selling directly?','[]',false),
('dddd0000-0000-4000-8000-000000000010','cccc0000-0000-4000-8000-000000000003',0,'single_choice','How do you usually travel from the metro station to your destination?','["Auto","Walk","Bus","Cab","E-rickshaw"]',true),
('dddd0000-0000-4000-8000-000000000011','cccc0000-0000-4000-8000-000000000003',1,'yes_no','Would you pay ₹20–30 for a fixed-price shared shuttle?','[]',true),
('dddd0000-0000-4000-8000-000000000012','cccc0000-0000-4000-8000-000000000003',2,'rating','How important is a guaranteed departure every 5 minutes? (1–5)','[]',true),
('dddd0000-0000-4000-8000-000000000013','cccc0000-0000-4000-8000-000000000003',3,'long_answer','Anything else we should know?','[]',false),
('dddd0000-0000-4000-8000-000000000014','cccc0000-0000-4000-8000-000000000004',0,'yes_no','Would your parents answer an automated reminder call?','[]',true);

insert into public.survey_responses (survey_id, respondent_id, answers, created_at) values
('cccc0000-0000-4000-8000-000000000001','33333333-3333-4333-8333-000000000001','{"dddd0000-0000-4000-8000-000000000001":"Monthly","dddd0000-0000-4000-8000-000000000002":5,"dddd0000-0000-4000-8000-000000000003":"Yes","dddd0000-0000-4000-8000-000000000004":["Live queue position","Works without smartphone"],"dddd0000-0000-4000-8000-000000000005":"Worried hospitals will not actually follow the token order."}', now() - interval '14 days'),
('cccc0000-0000-4000-8000-000000000001','33333333-3333-4333-8333-000000000002','{"dddd0000-0000-4000-8000-000000000001":"A few times a year","dddd0000-0000-4000-8000-000000000002":4,"dddd0000-0000-4000-8000-000000000003":"Yes","dddd0000-0000-4000-8000-000000000004":["Book a slot in advance","Reminder before my turn"],"dddd0000-0000-4000-8000-000000000005":"Price if it is not free for patients."}', now() - interval '13 days'),
('cccc0000-0000-4000-8000-000000000001','22222222-2222-4222-8222-000000000004','{"dddd0000-0000-4000-8000-000000000001":"Rarely","dddd0000-0000-4000-8000-000000000002":3,"dddd0000-0000-4000-8000-000000000003":"No","dddd0000-0000-4000-8000-000000000004":["Book a slot in advance"],"dddd0000-0000-4000-8000-000000000005":"I use private hospitals mostly."}', now() - interval '11 days'),
('cccc0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000003','{"dddd0000-0000-4000-8000-000000000001":"Monthly","dddd0000-0000-4000-8000-000000000002":5,"dddd0000-0000-4000-8000-000000000003":"Yes","dddd0000-0000-4000-8000-000000000004":["Live queue position","Reminder before my turn","Works without smartphone"],"dddd0000-0000-4000-8000-000000000005":"Language support in Kannada/Hindi is a must."}', now() - interval '9 days'),
('cccc0000-0000-4000-8000-000000000002','33333333-3333-4333-8333-000000000002','{"dddd0000-0000-4000-8000-000000000006":"Middleman tells me","dddd0000-0000-4000-8000-000000000007":"Yes","dddd0000-0000-4000-8000-000000000008":3,"dddd0000-0000-4000-8000-000000000009":"Payment delays"}', now() - interval '10 days'),
('cccc0000-0000-4000-8000-000000000002','33333333-3333-4333-8333-000000000001','{"dddd0000-0000-4000-8000-000000000006":"Neighbours","dddd0000-0000-4000-8000-000000000007":"Yes","dddd0000-0000-4000-8000-000000000008":4,"dddd0000-0000-4000-8000-000000000009":"Quality rejection at pickup"}', now() - interval '9 days'),
('cccc0000-0000-4000-8000-000000000002','22222222-2222-4222-8222-000000000005','{"dddd0000-0000-4000-8000-000000000006":"Mobile app","dddd0000-0000-4000-8000-000000000007":"Yes","dddd0000-0000-4000-8000-000000000008":5,"dddd0000-0000-4000-8000-000000000009":"Logistics reliability"}', now() - interval '6 days'),
('cccc0000-0000-4000-8000-000000000003','33333333-3333-4333-8333-000000000001','{"dddd0000-0000-4000-8000-000000000010":"Auto","dddd0000-0000-4000-8000-000000000011":"Yes","dddd0000-0000-4000-8000-000000000012":5,"dddd0000-0000-4000-8000-000000000013":"Evening frequency matters most."}', now() - interval '7 days'),
('cccc0000-0000-4000-8000-000000000003','33333333-3333-4333-8333-000000000002','{"dddd0000-0000-4000-8000-000000000010":"Walk","dddd0000-0000-4000-8000-000000000011":"No","dddd0000-0000-4000-8000-000000000012":2,"dddd0000-0000-4000-8000-000000000013":"I live close to the station."}', now() - interval '5 days');

-- AI analyses (demo provider, clearly labelled)
insert into public.ai_analyses (subject_type, subject_id, analysis_type, result, provider) values
('problem','aaaa0000-0000-4000-8000-000000000001','problem_analysis','{"category":"Healthcare","keywords":["hospital","queue","OPD","appointments","elderly"],"demand_indication":"High","related_problems":2,"similar_problems":1,"summary":"AI-based indication: strong engagement and repeated mentions of long OPD waits suggest a widely felt pain point.","suggested_categories":["Healthcare","Public services"]}','demo'),
('problem','aaaa0000-0000-4000-8000-000000000002','problem_analysis','{"category":"Agriculture","keywords":["farmers","pricing","mandi","middlemen"],"demand_indication":"High","related_problems":1,"similar_problems":0,"summary":"AI-based indication: price opacity for small farmers appears frequently across agri problems on the platform.","suggested_categories":["Agriculture","Fintech"]}','demo'),
('problem','aaaa0000-0000-4000-8000-000000000003','problem_analysis','{"category":"Transportation","keywords":["metro","last-mile","auto","commute"],"demand_indication":"Medium","related_problems":1,"similar_problems":0,"summary":"AI-based indication: moderate demand signal from urban commuters; strongly time-of-day dependent.","suggested_categories":["Transportation","Urban mobility"]}','demo'),
('problem','aaaa0000-0000-4000-8000-000000000005','problem_analysis','{"category":"Healthcare","keywords":["elderly","medication","adherence","caregivers"],"demand_indication":"Medium","related_problems":2,"similar_problems":1,"summary":"AI-based indication: related to OPD and home-nursing problems; caregivers are the likely paying user.","suggested_categories":["Healthcare","Eldercare"]}','demo'),
('survey','cccc0000-0000-4000-8000-000000000001','survey_analysis','{"total":4,"positive":3,"negative":1,"neutral":0,"sentiment":"Mostly positive","demand_indication":"Medium-High","common_issues":["Hospitals may not honour token order","Pricing for patients","Language support"],"common_suggestions":["Live queue position","Works without smartphone","Local language"],"top_trends":["Monthly OPD visits are common","Pain rating averages 4.25/5"],"summary":"AI-generated analysis: respondents showed strong interest in an SMS token system. The most common concern was whether hospitals would actually follow the token order, followed by pricing for patients."}','demo'),
('survey','cccc0000-0000-4000-8000-000000000002','survey_analysis','{"total":3,"positive":3,"negative":0,"neutral":0,"sentiment":"Positive","demand_indication":"High","common_issues":["Payment delays","Quality rejection at pickup","Logistics reliability"],"common_suggestions":["Guaranteed payment timelines","Transparent grading"],"top_trends":["All respondents open to direct selling","Trust in app payments averages 4/5"],"summary":"AI-generated analysis: all respondents were willing to sell directly if pickup is arranged. Payment reliability is the dominant concern."}','demo'),
('survey','cccc0000-0000-4000-8000-000000000003','survey_analysis','{"total":2,"positive":1,"negative":1,"neutral":0,"sentiment":"Mixed","demand_indication":"Medium","common_issues":["Not needed for people living near stations"],"common_suggestions":["Higher evening frequency"],"top_trends":["Auto is the default last-mile mode"],"summary":"AI-generated analysis: interest is split; commuters with longer last-mile distances show strong intent. Limited responses – treat with caution."}','demo'),
('startup','bbbb0000-0000-4000-8000-000000000001','validation_score','{"score":72,"factors":{"user_interest":78,"survey_response":70,"problem_frequency":85,"feedback_sentiment":72,"engagement":68,"market_signals":60},"positives":["High problem engagement (4 upvotes, 2 comments)","Strong survey intent (75% yes)","Daily frequency problem"],"concerns":["Limited survey sample (4 responses)","Dependence on hospital adoption","Pricing sensitivity"],"summary":"AI-assisted score. Not a guarantee of startup success."}','demo'),
('startup','bbbb0000-0000-4000-8000-000000000003','validation_score','{"score":81,"factors":{"user_interest":82,"survey_response":85,"problem_frequency":80,"feedback_sentiment":88,"engagement":72,"market_signals":78},"positives":["Unanimous willingness to sell directly","Early traction with buyers","Weekly recurring problem"],"concerns":["Payment trust","Logistics complexity","Small sample"],"summary":"AI-assisted score. Not a guarantee of startup success."}','demo'),
('startup','bbbb0000-0000-4000-8000-000000000005','validation_score','{"score":67,"factors":{"user_interest":70,"survey_response":60,"problem_frequency":85,"feedback_sentiment":62,"engagement":60,"market_signals":65},"positives":["Daily commute problem","Clear willingness to pay from distant commuters"],"concerns":["Mixed survey sentiment","Very limited responses","Regulatory partnerships needed"],"summary":"AI-assisted score. Not a guarantee of startup success."}','demo');

-- Connections & messages
insert into public.connections (id, requester_id, recipient_id, startup_id, status, message, created_at, responded_at) values
('eeee0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','bbbb0000-0000-4000-8000-000000000001','accepted','Hi Neha, QueueCare is piloting in Bengaluru OPDs and I think it fits your health thesis.', now() - interval '10 days', now() - interval '9 days'),
('eeee0000-0000-4000-8000-000000000002','22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002','bbbb0000-0000-4000-8000-000000000003','accepted','Impressed by FarmLink traction. Would like to learn more.', now() - interval '8 days', now() - interval '7 days'),
('eeee0000-0000-4000-8000-000000000003','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000001','bbbb0000-0000-4000-8000-000000000005','pending','Hi Neha, would love your feedback on MetroHop.', now() - interval '2 days', null),
('eeee0000-0000-4000-8000-000000000004','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000003','bbbb0000-0000-4000-8000-000000000002','pending','Sharing PillPal – early concept in eldercare.', now() - interval '1 day', null);

insert into public.messages (connection_id, sender_id, body, read_at, created_at) values
('eeee0000-0000-4000-8000-000000000001','22222222-2222-4222-8222-000000000001','Thanks for reaching out Karan. How many hospitals are in the pilot?', now() - interval '8 days', now() - interval '9 days'),
('eeee0000-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','Two right now, both district hospitals. Third one signing next month.', now() - interval '8 days', now() - interval '8 days'),
('eeee0000-0000-4000-8000-000000000001','22222222-2222-4222-8222-000000000001','Great. Can you share the pitch deck here? Happy to set up a call next week.', null, now() - interval '1 day'),
('eeee0000-0000-4000-8000-000000000002','11111111-1111-4111-8111-000000000002','Hi Aarav, thanks for connecting! We crossed 300 farmers last week.', now() - interval '6 days', now() - interval '7 days'),
('eeee0000-0000-4000-8000-000000000002','22222222-2222-4222-8222-000000000002','Solid. What is your take rate per transaction currently?', now() - interval '5 days', now() - interval '6 days'),
('eeee0000-0000-4000-8000-000000000002','11111111-1111-4111-8111-000000000002','Around 3% on average. Buyers pay an additional subscription for verified supply.', null, now() - interval '5 days');

-- Saved items
insert into public.saved_items (user_id, item_type, item_id) values
('11111111-1111-4111-8111-000000000001','problem','aaaa0000-0000-4000-8000-000000000011'),
('11111111-1111-4111-8111-000000000001','problem','aaaa0000-0000-4000-8000-000000000005'),
('22222222-2222-4222-8222-000000000001','startup','bbbb0000-0000-4000-8000-000000000001'),
('22222222-2222-4222-8222-000000000001','startup','bbbb0000-0000-4000-8000-000000000003'),
('33333333-3333-4333-8333-000000000001','problem','aaaa0000-0000-4000-8000-000000000003');

insert into public.topic_follows (user_id, topic) values
('33333333-3333-4333-8333-000000000001','Healthcare'),
('33333333-3333-4333-8333-000000000001','Transportation'),
('33333333-3333-4333-8333-000000000002','Education');

-- Extra notifications (triggers already created some)
insert into public.notifications (user_id, type, title, body, link, read_at, created_at) values
('11111111-1111-4111-8111-000000000001','ai_analysis','AI analysis completed','Validation score for QueueCare is ready: 72/100','/startups/bbbb0000-0000-4000-8000-000000000001', now() - interval '3 days', now() - interval '4 days'),
('22222222-2222-4222-8222-000000000001','match','New startup match','FarmLink matches your healthcare & consumer thesis at 64%','/matches', null, now() - interval '2 days'),
('22222222-2222-4222-8222-000000000001','startup_update','Startup update','QueueCare added a new milestone: Pilot at 2 hospitals','/startups/bbbb0000-0000-4000-8000-000000000001', null, now() - interval '1 day'),
('33333333-3333-4333-8333-000000000001','problem_engagement','Your problem is trending','"Long waiting times at government hospital OPDs" received 4 upvotes','/problems/aaaa0000-0000-4000-8000-000000000001', null, now() - interval '2 days');

insert into public.reports (reporter_id, target_type, target_id, reason, details, status) values
('33333333-3333-4333-8333-000000000002','problem','aaaa0000-0000-4000-8000-000000000012','Other','Demo report – testing the reporting workflow','open');