-- Enable RLS on all tenant-scoped tables
alter table businesses enable row level security;
alter table hooks enable row level security;
alter table scripts enable row level security;
alter table campaigns enable row level security;

-- Helper: get org_id for the currently authenticated user
create or replace function get_user_org_id()
returns uuid
language sql
security definer
as $$
  select org_id from user_profiles where id = auth.uid();
$$;

-- Businesses: users see only their org
create policy "org_isolation_businesses"
  on businesses for all
  using (org_id = get_user_org_id());

-- Hooks: users see only their org
create policy "org_isolation_hooks"
  on hooks for all
  using (org_id = get_user_org_id());

-- Scripts: users see only their org
create policy "org_isolation_scripts"
  on scripts for all
  using (org_id = get_user_org_id());

-- Campaigns: users see only their org
create policy "org_isolation_campaigns"
  on campaigns for all
  using (org_id = get_user_org_id());
