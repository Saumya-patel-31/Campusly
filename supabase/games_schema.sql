-- ── Daily Games Leaderboard ────────────────────────────────────────────
-- One row per user per day. Scores are upserted as each game is completed.

create table if not exists game_scores (
  user_id      uuid references profiles(id) on delete cascade not null,
  domain       text not null,
  score_date   date not null default current_date,
  wordle_score integer not null default 0,
  connect_score integer not null default 0,
  quiz_score   integer not null default 0,
  total_score  integer generated always as (wordle_score + connect_score + quiz_score) stored,
  updated_at   timestamptz default now(),
  primary key (user_id, score_date)
);

-- Enable real-time so leaderboard updates live across all clients
alter publication supabase_realtime add table game_scores;

-- RLS
alter table game_scores enable row level security;

-- Anyone on campus can read scores (for leaderboard)
create policy "gs_read"   on game_scores for select using (true);
-- Users can only insert/update their own row
create policy "gs_insert" on game_scores for insert with check (auth.uid() = user_id);
create policy "gs_update" on game_scores for update using (auth.uid() = user_id);
