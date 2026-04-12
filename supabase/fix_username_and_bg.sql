-- ═══════════════════════════════════════════════════════════════
--  Campusly — Patch: username uniqueness per campus + campus_bg
--  Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add campus_bg column for dark background tinting
alter table public.profiles
  add column if not exists campus_bg text default '#0a0a14';

-- 2. Drop the old global unique constraint on username (allows same
--    username across different campuses, but not within the same campus)
alter table public.profiles drop constraint if exists profiles_username_key;

-- 3. Add a unique constraint scoped to (username, domain)
--    so @alexr at umd.edu and @alexr at mit.edu are both allowed,
--    but two people at umd.edu cannot both be @alexr
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_domain_unique'
  ) then
    alter table public.profiles
      add constraint profiles_username_domain_unique unique (username, domain);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  Done. Run this once, then redeploy your app.
-- ═══════════════════════════════════════════════════════════════
