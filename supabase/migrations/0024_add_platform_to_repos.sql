-- Add platform to repos (default github for existing)
ALTER TABLE repos
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Rename github_id for clarity
ALTER TABLE repos RENAME COLUMN github_id TO platform_repo_id;

-- Change platform_repo_id type to TEXT to support non-numeric IDs (Bitbucket)
ALTER TABLE repos ALTER COLUMN platform_repo_id TYPE TEXT USING platform_repo_id::text;

-- Add platform-specific fields
ALTER TABLE repos ADD COLUMN platform_owner TEXT;
ALTER TABLE repos ADD COLUMN platform_project_id TEXT;

-- Index for platform queries
CREATE INDEX repos_platform_idx ON repos(platform);

-- Update unique constraint
ALTER TABLE repos DROP CONSTRAINT IF EXISTS repos_github_id_key;
ALTER TABLE repos ADD CONSTRAINT repos_platform_repo_unique
  UNIQUE (platform, platform_repo_id);
