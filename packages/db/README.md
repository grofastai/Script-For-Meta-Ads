# Database Migrations

## How to apply

1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Run each migration file in order:
   - `001_schema.sql` — creates all tables
   - `002_rls.sql` — enables Row Level Security
   - `003_seed.sql` — seeds starter data (Grofast org + 20 hooks)

## After applying migrations

Copy your Supabase project URL and anon key from:
Project Settings → API → Project URL + anon public key

Add them to:
- `apps/web/.env.local`
- `apps/api/.env`
