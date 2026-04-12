-- ─── Groups ──────────────────────────────────────────────────────────────────
create table if not exists groups (
  id            uuid primary key default gen_random_uuid(),
  domain        text not null,
  name          text not null,
  description   text,
  topic         text,           -- primary topic e.g. "Computer Science"
  tags          text[] default '{}',
  avatar_emoji  text default '👥',
  avatar_url    text,           -- optional uploaded image URL
  created_by    uuid references profiles(id) on delete set null,
  members_count int  default 1,
  posts_count   int  default 0,
  created_at    timestamptz default now()
);

-- If the table already exists, add the column with:
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS avatar_url text;

-- ─── Group Members ────────────────────────────────────────────────────────────
create table if not exists group_members (
  group_id  uuid references groups(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  role      text default 'member',   -- 'member' | 'admin'
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ─── Group Posts ──────────────────────────────────────────────────────────────
create table if not exists group_posts (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid references groups(id) on delete cascade,
  user_id        uuid references profiles(id) on delete cascade,
  content        text not null,
  likes_count    int  default 0,
  comments_count int  default 0,
  created_at     timestamptz default now()
);

-- ─── Group Post Likes ─────────────────────────────────────────────────────────
create table if not exists group_post_likes (
  post_id uuid references group_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table groups           enable row level security;
alter table group_members    enable row level security;
alter table group_posts      enable row level security;
alter table group_post_likes enable row level security;

-- Groups
create policy "read groups"   on groups for select using (true);
create policy "create groups" on groups for insert with check (auth.uid() = created_by);
create policy "update groups" on groups for update using (auth.uid() = created_by);

-- Group members
create policy "read members" on group_members for select using (true);
create policy "join group"   on group_members for insert with check (auth.uid() = user_id);
create policy "leave group"  on group_members for delete using (auth.uid() = user_id);

-- Group posts
create policy "read group posts"   on group_posts for select using (true);
create policy "create group post"  on group_posts for insert with check (auth.uid() = user_id);
create policy "delete own post"    on group_posts for delete using (auth.uid() = user_id);

-- Group post likes
create policy "read likes"  on group_post_likes for select using (true);
create policy "like post"   on group_post_likes for insert with check (auth.uid() = user_id);
create policy "unlike post" on group_post_likes for delete using (auth.uid() = user_id);

-- ─── Auto-increment members_count ────────────────────────────────────────────
create or replace function update_group_members_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update groups set members_count = members_count + 1 where id = NEW.group_id;
  elsif TG_OP = 'DELETE' then
    update groups set members_count = greatest(members_count - 1, 0) where id = OLD.group_id;
  end if;
  return null;
end;
$$;

create trigger trg_group_members_count
after insert or delete on group_members
for each row execute function update_group_members_count();

-- ─── Auto-increment posts_count ───────────────────────────────────────────────
create or replace function update_group_posts_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update groups set posts_count = posts_count + 1 where id = NEW.group_id;
  elsif TG_OP = 'DELETE' then
    update groups set posts_count = greatest(posts_count - 1, 0) where id = OLD.group_id;
  end if;
  return null;
end;
$$;

create trigger trg_group_posts_count
after insert or delete on group_posts
for each row execute function update_group_posts_count();

-- ─── Auto-increment likes_count ───────────────────────────────────────────────
create or replace function update_group_post_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update group_posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update group_posts set likes_count = greatest(likes_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_group_post_likes_count
after insert or delete on group_post_likes
for each row execute function update_group_post_likes_count();

-- ─── Storage bucket for group icons ──────────────────────────────────────────
-- Run this in Supabase dashboard → Storage → New bucket (public bucket: group-avatars)
-- Or via SQL:
insert into storage.buckets (id, name, public) values ('group-avatars', 'group-avatars', true)
  on conflict do nothing;

create policy "group avatars public read" on storage.objects for select using (bucket_id = 'group-avatars');
create policy "group avatars upload"      on storage.objects for insert with check (bucket_id = 'group-avatars' and auth.uid() is not null);
create policy "group avatars update"      on storage.objects for update using (bucket_id = 'group-avatars' and auth.uid() is not null);
create policy "group avatars delete"      on storage.objects for delete using (bucket_id = 'group-avatars' and auth.uid() is not null);
