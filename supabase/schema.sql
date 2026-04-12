-- ═══════════════════════════════════════════════════════════════
--  Campusly — Supabase PostgreSQL Schema
--  Run this entire file in your Supabase SQL Editor once.
--  Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────────
-- One row per user. Created automatically on signup via trigger.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  bio           text default '',
  major         text default '',
  year          text default '',
  domain        text not null,           -- e.g. "umd.edu"
  campus_name   text not null,           -- e.g. "University of Maryland"
  campus_short  text not null,           -- e.g. "UMD"
  campus_emoji  text default '🎓',
  campus_color  text default '#6C63FF',
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by campus members"
  on profiles for select
  using (
    domain = (select domain from profiles where id = auth.uid())
  );

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Note: no insert policy needed — the trigger below handles profile creation
-- and runs as security definer (bypasses RLS)

-- ── Auto-create profile on signup ───────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, username, display_name, domain,
    campus_name, campus_short, campus_emoji, campus_color
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    split_part(new.email, '@', 2),
    coalesce(new.raw_user_meta_data->>'campus_name', split_part(new.email, '@', 2)),
    coalesce(new.raw_user_meta_data->>'campus_short', upper(split_part(split_part(new.email, '@', 2), '.', 1))),
    coalesce(new.raw_user_meta_data->>'campus_emoji', '🎓'),
    coalesce(new.raw_user_meta_data->>'campus_color', '#6C63FF')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Posts ────────────────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade not null,
  domain        text not null,
  caption       text default '',
  media_url     text,                    -- image or video URL from storage
  media_type    text check (media_type in ('image', 'video', null)),
  tags          text[] default '{}',
  likes_count   int default 0,
  comments_count int default 0,
  created_at    timestamptz default now()
);

alter table posts enable row level security;

create policy "Campus members can view posts"
  on posts for select
  using (
    domain = (select domain from profiles where id = auth.uid())
  );

create policy "Authenticated users can create posts"
  on posts for insert
  with check (user_id = auth.uid());

create policy "Users can delete own posts"
  on posts for delete
  using (user_id = auth.uid());

create policy "System can update post counts"
  on posts for update
  using (true);

-- ── Likes ────────────────────────────────────────────────────────
create table if not exists likes (
  id       uuid primary key default uuid_generate_v4(),
  post_id  uuid references posts(id) on delete cascade not null,
  user_id  uuid references profiles(id) on delete cascade not null,
  unique(post_id, user_id)
);

alter table likes enable row level security;

create policy "Likes visible to campus members"
  on likes for select using (true);

create policy "Users can like posts"
  on likes for insert with check (user_id = auth.uid());

create policy "Users can unlike posts"
  on likes for delete using (user_id = auth.uid());

-- Auto-update likes_count on posts
create or replace function update_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set likes_count = likes_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on likes
  for each row execute procedure update_likes_count();

-- ── Comments ─────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid references posts(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  text       text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "Comments visible to campus"
  on comments for select using (true);

create policy "Users can comment"
  on comments for insert with check (user_id = auth.uid());

create policy "Users can delete own comments"
  on comments for delete using (user_id = auth.uid());

-- Auto-update comments_count on posts
create or replace function update_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comments_count = comments_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure update_comments_count();

-- ── Follows ──────────────────────────────────────────────────────
create table if not exists follows (
  id          uuid primary key default uuid_generate_v4(),
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(follower_id, following_id)
);

alter table follows enable row level security;

create policy "Follows visible to all"
  on follows for select using (true);

create policy "Users can follow"
  on follows for insert with check (follower_id = auth.uid());

create policy "Users can unfollow"
  on follows for delete using (follower_id = auth.uid());

-- ── Direct Messages ───────────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid references profiles(id) on delete cascade not null,
  receiver_id  uuid references profiles(id) on delete cascade not null,
  text         text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);

alter table messages enable row level security;

create policy "Users can view their own messages"
  on messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can send messages"
  on messages for insert
  with check (sender_id = auth.uid());

create policy "Users can mark messages read"
  on messages for update
  using (receiver_id = auth.uid());

-- ── Storage buckets ───────────────────────────────────────────────
-- Run these in the Supabase Storage UI or via this SQL:
insert into storage.buckets (id, name, public)
  values ('posts', 'posts', true)
  on conflict do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict do nothing;

create policy "Anyone can view post media"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "Authenticated users can upload post media"
  on storage.objects for insert
  with check (bucket_id = 'posts' and auth.role() = 'authenticated');

create policy "Users can delete own post media"
  on storage.objects for delete
  using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Realtime ─────────────────────────────────────────────────────
-- Enable realtime on posts and messages tables
-- (Do this in Supabase Dashboard → Database → Replication → enable for posts, messages)

-- ── Shared posts in messages ─────────────────────────────────────
alter table messages add column if not exists shared_post_id uuid references posts(id) on delete set null;
alter table messages add column if not exists edited boolean default false;
alter table messages add column if not exists deleted_for_sender   boolean default false;
alter table messages add column if not exists deleted_for_receiver boolean default false;

-- Allow senders to edit/unsend their own messages
create policy "Users can edit own messages"
  on messages for update
  using (sender_id = auth.uid());

-- Allow receivers to soft-delete chat from their side
create policy "Receivers can soft-delete messages"
  on messages for update
  using (receiver_id = auth.uid());

-- Allow senders to hard-delete (unsend) their own messages
create policy "Users can delete own messages"
  on messages for delete
  using (sender_id = auth.uid());

-- ── Threads ───────────────────────────────────────────────────────
create table if not exists threads (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade not null,
  domain        text not null,
  title         text not null,
  body          text default '',
  tags          text[] default '{}',
  upvotes_count int default 0,
  replies_count int default 0,
  created_at    timestamptz default now()
);

alter table threads enable row level security;

create policy "Campus members can view threads"
  on threads for select
  using (domain = (select domain from profiles where id = auth.uid()));

create policy "Authenticated users can create threads"
  on threads for insert
  with check (user_id = auth.uid());

create policy "Users can delete own threads"
  on threads for delete
  using (user_id = auth.uid());

create policy "System can update thread counts"
  on threads for update
  using (true);

-- ── Thread Replies ────────────────────────────────────────────────
create table if not exists thread_replies (
  id              uuid primary key default uuid_generate_v4(),
  thread_id       uuid references threads(id) on delete cascade not null,
  user_id         uuid references profiles(id) on delete cascade not null,
  parent_reply_id uuid references thread_replies(id) on delete cascade,
  body            text not null,
  upvotes_count   int default 0,
  created_at      timestamptz default now()
);

alter table thread_replies enable row level security;

create policy "Campus members can view thread replies"
  on thread_replies for select using (true);

create policy "Authenticated users can reply"
  on thread_replies for insert
  with check (user_id = auth.uid());

create policy "Users can delete own replies"
  on thread_replies for delete
  using (user_id = auth.uid());

create policy "System can update reply counts"
  on thread_replies for update
  using (true);

-- Auto-update replies_count on threads
create or replace function update_thread_replies_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update threads set replies_count = replies_count + 1 where id = NEW.thread_id;
  elsif TG_OP = 'DELETE' then
    update threads set replies_count = replies_count - 1 where id = OLD.thread_id;
  end if;
  return null;
end;
$$;

create trigger on_thread_reply_change
  after insert or delete on thread_replies
  for each row execute procedure update_thread_replies_count();

-- ── Thread Votes ──────────────────────────────────────────────────
create table if not exists thread_votes (
  id        uuid primary key default uuid_generate_v4(),
  thread_id uuid references threads(id) on delete cascade,
  reply_id  uuid references thread_replies(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade not null,
  value     int not null check (value in (1, -1)),
  created_at timestamptz default now(),
  constraint one_target check (
    (thread_id is not null and reply_id is null) or
    (thread_id is null and reply_id is not null)
  ),
  unique(thread_id, user_id),
  unique(reply_id, user_id)
);

alter table thread_votes enable row level security;

create policy "Votes visible to campus members"
  on thread_votes for select using (true);

create policy "Users can vote"
  on thread_votes for insert
  with check (user_id = auth.uid());

create policy "Users can change their vote"
  on thread_votes for update
  using (user_id = auth.uid());

create policy "Users can remove their vote"
  on thread_votes for delete
  using (user_id = auth.uid());

-- Auto-update upvotes_count when votes change
create or replace function update_vote_counts()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.thread_id is not null then
      update threads set upvotes_count = upvotes_count + NEW.value where id = NEW.thread_id;
    else
      update thread_replies set upvotes_count = upvotes_count + NEW.value where id = NEW.reply_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.thread_id is not null then
      update threads set upvotes_count = upvotes_count - OLD.value where id = OLD.thread_id;
    else
      update thread_replies set upvotes_count = upvotes_count - OLD.value where id = OLD.reply_id;
    end if;
  elsif TG_OP = 'UPDATE' then
    if NEW.thread_id is not null then
      update threads set upvotes_count = upvotes_count - OLD.value + NEW.value where id = NEW.thread_id;
    else
      update thread_replies set upvotes_count = upvotes_count - OLD.value + NEW.value where id = NEW.reply_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger on_thread_vote_change
  after insert or update or delete on thread_votes
  for each row execute procedure update_vote_counts();

-- ── Group member count helpers ───────────────────────────────────
create or replace function public.increment_group_members(gid uuid)
returns void language sql security definer as $$
  update public.groups set members_count = members_count + 1 where id = gid;
$$;

create or replace function public.decrement_group_members(gid uuid)
returns void language sql security definer as $$
  update public.groups set members_count = greatest(0, members_count - 1) where id = gid;
$$;

-- ── Email existence check ────────────────────────────────────────
-- Used by the join-campus flow to detect existing accounts before
-- sending an OTP, so returning users are directed to sign-in/reset.
create or replace function public.check_email_registered(p_email text)
returns boolean
language plpgsql security definer
set search_path = public, auth
as $$
begin
  return exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════
--  DONE. Your schema is ready.
-- ═══════════════════════════════════════════════════════════════
