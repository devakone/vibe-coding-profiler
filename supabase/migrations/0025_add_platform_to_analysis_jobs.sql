ALTER TABLE analysis_jobs
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));
