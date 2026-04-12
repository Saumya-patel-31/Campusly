-- ── Lost & Found ─────────────────────────────────────────────────────

create table if not exists lost_found_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  domain      text not null,
  type        text not null check (type in ('lost', 'found')),
  title       text not null,
  description text,
  location    text,
  image_url   text,
  status      text not null default 'active' check (status in ('active', 'resolved')),
  created_at  timestamptz default now()
);

-- RLS
alter table lost_found_items enable row level security;

create policy "lf_read"   on lost_found_items for select using (true);
create policy "lf_insert" on lost_found_items for insert with check (auth.uid() = user_id);
create policy "lf_update" on lost_found_items for update using (auth.uid() = user_id);
create policy "lf_delete" on lost_found_items for delete using (auth.uid() = user_id);

-- Storage bucket for item photos
-- Run in Supabase dashboard > Storage if it doesn't exist:
-- insert into storage.buckets (id, name, public) values ('lost-found-images', 'lost-found-images', true);

-- Storage policies (run after creating bucket)
-- create policy "lf_img_read"   on storage.objects for select using (bucket_id = 'lost-found-images');
-- create policy "lf_img_insert" on storage.objects for insert with check (bucket_id = 'lost-found-images' and auth.role() = 'authenticated');
-- create policy "lf_img_delete" on storage.objects for delete using (bucket_id = 'lost-found-images' and auth.uid()::text = (storage.foldername(name))[1]);
