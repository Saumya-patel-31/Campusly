-- ── Campus Mood Board ────────────────────────────────────────────────
-- Anonymous daily mood pulse. One vote per user per day.
-- user_id stored only for deduplication — never exposed in queries.

create table if not exists mood_votes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade not null,
  domain    text not null,
  mood      text not null,
  voted_on  date not null default current_date,
  hour      int  not null default extract(hour from now())::int,
  created_at timestamptz default now(),
  unique(user_id, domain, voted_on)   -- one vote per user per day, updatable
);

-- RLS
alter table mood_votes enable row level security;

-- Anyone on campus can read aggregates (no individual rows exposed)
create policy "mv_read"   on mood_votes for select using (true);
create policy "mv_insert" on mood_votes for insert with check (auth.uid() = user_id);
create policy "mv_update" on mood_votes for update using (auth.uid() = user_id);
create policy "mv_delete" on mood_votes for delete using (auth.uid() = user_id);
