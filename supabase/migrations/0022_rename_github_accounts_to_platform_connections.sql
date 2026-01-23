-- Rename table
ALTER TABLE github_accounts RENAME TO platform_connections;

-- Add platform discriminator (existing rows are GitHub)
ALTER TABLE platform_connections
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Add platform-specific user info
ALTER TABLE platform_connections
  ADD COLUMN platform_user_id TEXT,
  ADD COLUMN platform_username TEXT,
  ADD COLUMN platform_email TEXT,
  ADD COLUMN platform_avatar_url TEXT;

-- Add token refresh support (GitLab/Bitbucket use refresh tokens)
ALTER TABLE platform_connections
  ADD COLUMN refresh_token_encrypted TEXT,
  ADD COLUMN token_expires_at TIMESTAMPTZ;

-- Add primary/disconnect tracking
ALTER TABLE platform_connections
  ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN disconnected_at TIMESTAMPTZ;

-- Make github_user_id nullable as it is specific to GitHub
ALTER TABLE platform_connections ALTER COLUMN github_user_id DROP NOT NULL;

-- Update unique constraints
ALTER TABLE platform_connections
  DROP CONSTRAINT IF EXISTS github_accounts_user_id_key;

ALTER TABLE platform_connections
  ADD CONSTRAINT platform_connections_user_platform_unique
  UNIQUE (user_id, platform);

ALTER TABLE platform_connections
  ADD CONSTRAINT platform_connections_platform_user_unique
  UNIQUE (platform, platform_user_id);

-- Only one primary platform per user
CREATE UNIQUE INDEX platform_connections_one_primary_idx
  ON platform_connections (user_id)
  WHERE is_primary = true AND disconnected_at IS NULL;

-- RLS policies (update existing)
DROP POLICY IF EXISTS "github_accounts_select_own" ON platform_connections;
DROP POLICY IF EXISTS "github_accounts_insert_own" ON platform_connections;
DROP POLICY IF EXISTS "github_accounts_update_own" ON platform_connections;

CREATE POLICY "Users can view own platforms"
  ON platform_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms"
  ON platform_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms"
  ON platform_connections FOR UPDATE
  USING (auth.uid() = user_id);
