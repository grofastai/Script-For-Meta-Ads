-- Seed: one default organization for Grofast internal use
insert into organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', 'Grofast', 'internal')
on conflict do nothing;

-- Seed: 20 starter hooks in the hook bank (optical niche, Dharmapuri + Salem)
insert into hooks (org_id, text, language, niche, city, hook_type, source, views, performance_score)
values
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la innum neraya per indha mistake pannitu irukanga...', 'tanglish', 'optical', 'dharmapuri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Unga kannadi power adhigama aagudhu-na idhu dhaan reason.', 'tanglish', 'optical', 'dharmapuri', 'problem-solution', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', '10 seconds kudunga... unga kannukku mukkiyamaana vishayam.', 'tanglish', 'optical', 'dharmapuri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Salem la oru optical store idha panna simpleaa maruthutanga...', 'tanglish', 'optical', 'salem', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Free eye checkup - intha week mattum Salem la.', 'tanglish', 'optical', 'salem', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Krishnagiri makkale - unga kannadi quality-a check panneenga-a?', 'tanglish', 'optical', 'krishnagiri', 'local', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Specs vaangum pothu ivvlo important - aaana yarum sollamaatanga.', 'tanglish', 'optical', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'First 50 customers free frame - today only.', 'tanglish', 'optical', null, 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', '500+ customers already changed their specs here - unga turn?', 'tanglish', 'optical', 'dharmapuri', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Headache varudha? Screen paakireenga-a? Idhu reason.', 'tanglish', 'optical', null, 'problem-solution', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la best optical store - customers solranga.', 'tanglish', 'optical', 'dharmapuri', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Plot vaanganum-na Salem la oru vishayam theriyanum.', 'tanglish', 'real-estate', 'salem', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Krishnagiri la site vaanganum-na idha paaru - 2026 price list.', 'tanglish', 'real-estate', 'krishnagiri', 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Hosur SIPCOT pakkam 3 cents - last 2 sites.', 'tanglish', 'real-estate', 'hosur', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Dharmapuri la free consultation - doctor available today.', 'tanglish', 'hospital', 'dharmapuri', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Salem la best coaching center - result paaru.', 'tanglish', 'education', 'salem', 'social-proof', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'NEET la 600+ mark vaanganum-na indha one thing panna podum.', 'tanglish', 'education', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Karimangalam makkale - indha offer 48 hours mattum.', 'tanglish', 'optical', 'karimangalam', 'urgency', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Unga area la ippo trending - paaru.', 'tanglish', 'optical', null, 'curiosity', 'manual', 0, 0),
  ('00000000-0000-0000-0000-000000000001', 'Anniversary special - buy frame + lens save Rs.2000.', 'tanglish', 'optical', null, 'urgency', 'manual', 0, 0)
on conflict do nothing;
