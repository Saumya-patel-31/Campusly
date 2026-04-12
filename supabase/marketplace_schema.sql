-- ── Campus Marketplace ────────────────────────────────────────────────

create table if not exists marketplace_listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  domain      text not null,
  title       text not null,
  description text,
  price       numeric(10,2) not null,
  condition   text not null check (condition in ('new','like_new','good','fair','poor')),
  category    text,
  image_url   text,
  status      text not null default 'active' check (status in ('active','sold')),
  created_at  timestamptz default now()
);

-- RLS
alter table marketplace_listings enable row level security;

create policy "ml_read"   on marketplace_listings for select using (true);
create policy "ml_insert" on marketplace_listings for insert with check (auth.uid() = user_id);
create policy "ml_update" on marketplace_listings for update using (auth.uid() = user_id);
create policy "ml_delete" on marketplace_listings for delete using (auth.uid() = user_id);

-- Images are stored in the existing lost-found-images bucket under a marketplace/ prefix.
-- No extra storage setup needed.
