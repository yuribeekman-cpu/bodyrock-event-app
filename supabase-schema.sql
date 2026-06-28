-- Body Rock Event App — Supabase Schema
-- Run dit in de Supabase SQL editor

-- ─────────────────────────────────────────
-- 1. EVENTS
-- ─────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text not null,
  date date not null,
  location text,
  is_active boolean default false,
  event_code text unique,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 2. CHALLENGES
-- ─────────────────────────────────────────
create table challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  number integer not null,
  title text not null,
  description text,
  score_type text not null check (score_type in ('time', 'reps')),
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(event_id, number)
);

-- ─────────────────────────────────────────
-- 3. TEAMS
-- ─────────────────────────────────────────
create table teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  join_code text unique not null,
  captain_name text,
  created_at timestamptz default now(),
  unique(event_id, name)
);

-- ─────────────────────────────────────────
-- 4. SCORES
-- ─────────────────────────────────────────
create table scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  minutes integer,
  seconds integer,
  reps integer,
  photo_url text,
  submitted_at timestamptz default now(),
  verified boolean default false,
  unique(team_id, challenge_id)
);

-- ─────────────────────────────────────────
-- 5. STORAGE BUCKET
-- ─────────────────────────────────────────
-- Maak handmatig aan in Supabase Dashboard > Storage > New bucket
-- Naam: challenge-photos
-- Aanvinken: Public bucket

-- ─────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table events enable row level security;
alter table challenges enable row level security;
alter table teams enable row level security;
alter table scores enable row level security;

-- Iedereen mag alles lezen
create policy "Lezen: events" on events for select using (true);
create policy "Lezen: challenges" on challenges for select using (true);
create policy "Lezen: teams" on teams for select using (true);
create policy "Lezen: scores" on scores for select using (true);

-- Iedereen mag schrijven (beveiliging zit in de app via admin cookie)
create policy "Schrijven: events" on events for insert with check (true);
create policy "Schrijven: events update" on events for update using (true);
create policy "Schrijven: challenges" on challenges for insert with check (true);
create policy "Schrijven: teams" on teams for insert with check (true);
create policy "Schrijven: scores insert" on scores for insert with check (true);
create policy "Schrijven: scores update" on scores for update using (true);

-- Storage: iedereen mag uploaden en lezen (public bucket)
-- Stel dit in via Supabase Dashboard > Storage > challenge-photos > Policies:
-- INSERT: true
-- SELECT: true
