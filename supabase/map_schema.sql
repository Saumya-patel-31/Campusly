-- ── Campus Resource Map ──────────────────────────────────────────────

create table if not exists map_pins (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  domain         text not null,
  category       text not null,   -- 'study' | 'food' | 'printer' | 'vending' | 'charging' | 'water' | 'coffee' | 'parking'
  title          text not null,
  description    text,
  lat            double precision not null,
  lng            double precision not null,
  expires_at     timestamptz,     -- null = permanent
  confirms_count int default 0,
  created_at     timestamptz default now()
);

create table if not exists map_pin_confirms (
  id      uuid primary key default gen_random_uuid(),
  pin_id  uuid references map_pins(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  unique(pin_id, user_id)
);

-- ── Triggers for confirms_count ──────────────────────────────────────
create or replace function inc_pin_confirms()
returns trigger language plpgsql as $$
begin
  update map_pins set confirms_count = confirms_count + 1 where id = NEW.pin_id;
  return NEW;
end;
$$;

create or replace function dec_pin_confirms()
returns trigger language plpgsql as $$
begin
  update map_pins set confirms_count = greatest(confirms_count - 1, 0) where id = OLD.pin_id;
  return OLD;
end;
$$;

drop trigger if exists trg_inc_pin_confirms on map_pin_confirms;
create trigger trg_inc_pin_confirms
  after insert on map_pin_confirms
  for each row execute function inc_pin_confirms();

drop trigger if exists trg_dec_pin_confirms on map_pin_confirms;
create trigger trg_dec_pin_confirms
  after delete on map_pin_confirms
  for each row execute function dec_pin_confirms();

-- ── Cleanup expired pins (call via rpc) ─────────────────────────────
create or replace function cleanup_expired_pins()
returns void language plpgsql security definer as $$
begin
  delete from map_pins where expires_at is not null and expires_at < now();
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table map_pins         enable row level security;
alter table map_pin_confirms enable row level security;

create policy "pins_read"    on map_pins for select using (true);
create policy "pins_insert"  on map_pins for insert with check (auth.uid() = user_id);
create policy "pins_delete"  on map_pins for delete using (auth.uid() = user_id);

create policy "confirms_read"   on map_pin_confirms for select using (true);
create policy "confirms_insert" on map_pin_confirms for insert with check (auth.uid() = user_id);
create policy "confirms_delete" on map_pin_confirms for delete using (auth.uid() = user_id);
