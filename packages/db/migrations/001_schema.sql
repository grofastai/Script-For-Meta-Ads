-- Organizations (SaaS multi-tenancy — one org = one agency)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'internal',
  created_at timestamptz not null default now()
);

-- User profiles extending Supabase auth.users
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- Business profiles (clients)
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  niche text not null,
  city text not null,
  target_audience text,
  created_at timestamptz not null default now()
);

-- Hook bank (manual + scraped)
create table if not exists hooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  text text not null,
  language text not null default 'tanglish' check (language in ('tanglish', 'english', 'tamil')),
  niche text not null,
  city text,
  hook_type text check (hook_type in ('curiosity', 'urgency', 'local', 'problem-solution', 'social-proof')),
  source text not null default 'manual' check (source in ('manual', 'scraped', 'generated')),
  views bigint default 0,
  use_count integer default 0,
  saturation_score float default 0 check (saturation_score >= 0 and saturation_score <= 1),
  performance_score float default 0 check (performance_score >= 0 and performance_score <= 1),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Generated scripts (every AI generation stored)
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  business_id uuid references businesses(id),
  user_id uuid references auth.users(id),
  input_params jsonb not null,
  output jsonb not null,
  hook_id uuid references hooks(id),
  model_used text,
  created_at timestamptz not null default now()
);

-- Campaign performance (logged manually)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  script_id uuid references scripts(id),
  business_id uuid references businesses(id),
  goal text not null check (goal in ('reach', 'leads', 'sales', 'engagement')),
  reach bigint default 0,
  leads integer default 0,
  cost numeric(10,2) default 0,
  cpl numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);

-- Raw scraped content (before processing into hooks)
create table if not exists scraped_content (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'facebook', 'youtube', 'tiktok')),
  url text,
  hook_text text not null,
  views bigint default 0,
  likes bigint default 0,
  shares bigint default 0,
  niche_tag text,
  processed boolean default false,
  scraped_at timestamptz not null default now()
);

-- Meta ads intelligence
create table if not exists meta_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text,
  niche text,
  city text,
  offer_type text,
  days_active integer default 0,
  creative_type text,
  first_seen date,
  last_seen date,
  created_at timestamptz not null default now()
);
