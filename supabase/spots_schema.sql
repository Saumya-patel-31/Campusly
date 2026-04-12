-- ── Spots ────────────────────────────────────────────────────────────
-- "I'll be at X at Y time, join me!"

create table if not exists spots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  domain         text not null,
  location       text not null,
  description    text,
  vibe           text,          -- 'study' | 'chill' | 'coffee' | 'food' | 'walk' | 'gym' | 'gaming' | 'other'
  meet_at        timestamptz not null,
  created_at     timestamptz default now(),
  attendees_count int default 1 -- creator auto-joins
);

create table if not exists spot_attendees (
  id        uuid primary key default gen_random_uuid(),
  spot_id   uuid references spots(id) on delete cascade not null,
  user_id   uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(spot_id, user_id)
);

-- ── Triggers: keep attendees_count in sync ──────────────────────────
create or replace function inc_spot_attendees()
returns trigger language plpgsql as $$
begin
  update spots set attendees_count = attendees_count + 1 where id = NEW.spot_id;
  return NEW;
end;
$$;

create or replace function dec_spot_attendees()
returns trigger language plpgsql as $$
begin
  update spots set attendees_count = greatest(attendees_count - 1, 0) where id = OLD.spot_id;
  return OLD;
end;
$$;

drop trigger if exists trg_inc_spot_attendees on spot_attendees;
create trigger trg_inc_spot_attendees
  after insert on spot_attendees
  for each row execute function inc_spot_attendees();

drop trigger if exists trg_dec_spot_attendees on spot_attendees;
create trigger trg_dec_spot_attendees
  after delete on spot_attendees
  for each row execute function dec_spot_attendees();

-- ── Auto-cleanup: delete spots older than 1 hour ───────────────────
-- Call this from the frontend on page load via supabase.rpc('cleanup_expired_spots')
create or replace function cleanup_expired_spots()
returns void language plpgsql security definer as $$
begin
  delete from spots where meet_at < now() - interval '1 hour';
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table spots          enable row level security;
alter table spot_attendees enable row level security;

-- spots: anyone on same domain can read; auth users can insert/delete own
create policy "spots_read"   on spots for select using (true);
create policy "spots_insert" on spots for insert with check (auth.uid() = user_id);
create policy "spots_delete" on spots for delete using (auth.uid() = user_id);

-- attendees: anyone can read; only own rows to insert/delete
create policy "sa_read"   on spot_attendees for select using (true);
create policy "sa_insert" on spot_attendees for insert with check (auth.uid() = user_id);
create policy "sa_delete" on spot_attendees for delete using (auth.uid() = user_id);
