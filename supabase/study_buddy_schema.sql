-- ── Study Buddy Matching ─────────────────────────────────────────────
-- Stores each user's study style questionnaire answers.
-- Matching is computed client-side — no PII stored here beyond what
-- the user already shares in their public profile.

create table if not exists study_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  domain     text not null,
  answers    jsonb not null,   -- { study_time, style, environment, goals, breaks, location, availability }
  updated_at timestamptz default now()
);

-- RLS: users can see study profiles on their domain only
alter table study_profiles enable row level security;

create policy "sp_read"   on study_profiles for select using (true);
create policy "sp_insert" on study_profiles for insert with check (auth.uid() = user_id);
create policy "sp_update" on study_profiles for update using (auth.uid() = user_id);
create policy "sp_delete" on study_profiles for delete using (auth.uid() = user_id);
