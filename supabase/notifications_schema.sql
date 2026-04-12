-- ═══════════════════════════════════════════════════════════════
--  Campusly — Notifications Schema
--  Run in Supabase SQL Editor after the main schema.
-- ═══════════════════════════════════════════════════════════════

create table if not exists notifications (
  id           uuid primary key default uuid_generate_v4(),
  recipient_id uuid references profiles(id) on delete cascade not null,
  actor_id     uuid references profiles(id) on delete cascade not null,
  type         text not null check (type in ('thread_reply', 'spot_join', 'message')),
  -- contextual link targets
  thread_id    uuid references threads(id) on delete cascade,
  spot_id      uuid references spots(id) on delete cascade,
  read         boolean default false,
  created_at   timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select
  using (recipient_id = auth.uid());

create policy "Users can mark own notifications read"
  on notifications for update
  using (recipient_id = auth.uid());

create policy "System can insert notifications"
  on notifications for insert
  with check (true);

create policy "Users can delete own notifications"
  on notifications for delete
  using (recipient_id = auth.uid());

-- Index for fast unread lookups
create index if not exists notifications_recipient_read_idx
  on notifications(recipient_id, read, created_at desc);

-- ── Auto-notify on thread reply ───────────────────────────────────
-- Notifies the thread author when someone replies.
-- Also notifies the parent-reply author when nested reply is posted.
create or replace function notify_thread_reply()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_thread_author  uuid;
  v_parent_author  uuid;
begin
  -- Get thread author
  select user_id into v_thread_author from public.threads where id = NEW.thread_id;

  -- Don't notify yourself
  if v_thread_author is not null and v_thread_author <> NEW.user_id then
    insert into public.notifications(recipient_id, actor_id, type, thread_id)
    values (v_thread_author, NEW.user_id, 'thread_reply', NEW.thread_id);
  end if;

  -- Notify parent reply author if this is a nested reply (and different from thread author)
  if NEW.parent_reply_id is not null then
    select user_id into v_parent_author from public.thread_replies where id = NEW.parent_reply_id;
    if v_parent_author is not null
       and v_parent_author <> NEW.user_id
       and v_parent_author <> coalesce(v_thread_author, NEW.user_id) then
      insert into public.notifications(recipient_id, actor_id, type, thread_id)
      values (v_parent_author, NEW.user_id, 'thread_reply', NEW.thread_id);
    end if;
  end if;

  return NEW;
end;
$$;

create trigger on_thread_reply_notify
  after insert on thread_replies
  for each row execute procedure notify_thread_reply();

-- ── Auto-notify on spot join ──────────────────────────────────────
create or replace function notify_spot_join()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_spot_author uuid;
begin
  select user_id into v_spot_author from public.spots where id = NEW.spot_id;

  if v_spot_author is not null and v_spot_author <> NEW.user_id then
    insert into public.notifications(recipient_id, actor_id, type, spot_id)
    values (v_spot_author, NEW.user_id, 'spot_join', NEW.spot_id);
  end if;

  return NEW;
end;
$$;

create trigger on_spot_join_notify
  after insert on spot_attendees
  for each row execute procedure notify_spot_join();

-- ═══════════════════════════════════════════════════════════════
--  DONE.
-- ═══════════════════════════════════════════════════════════════
