-- Add tags array column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for tag search performance
CREATE INDEX IF NOT EXISTS profiles_tags_idx ON profiles USING GIN(tags);
