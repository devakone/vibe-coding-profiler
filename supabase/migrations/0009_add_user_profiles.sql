-- User profiles: aggregated persona across all analyzed repos
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Aggregated from all completed jobs
  total_commits INTEGER NOT NULL DEFAULT 0,
  total_repos INTEGER NOT NULL DEFAULT 0,
  job_ids UUID[] NOT NULL DEFAULT '{}',

  -- Aggregated axes (weighted average by commit count)
  axes_json JSONB NOT NULL DEFAULT '{}',

  -- Aggregated persona
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  persona_tagline TEXT,
  persona_confidence TEXT NOT NULL,
  persona_score INTEGER NOT NULL DEFAULT 0,

  -- Per-repo breakdown for UI
  repo_personas_json JSONB NOT NULL DEFAULT '[]',

  -- Insight cards for profile-level share
  cards_json JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Track profile changes over time
CREATE TABLE IF NOT EXISTS public.user_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_snapshot JSONB NOT NULL,
  trigger_job_id UUID REFERENCES public.analysis_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profile_history_user_id_idx ON public.user_profile_history(user_id);
CREATE INDEX IF NOT EXISTS user_profile_history_created_at_idx ON public.user_profile_history(created_at DESC);

-- RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY user_profiles_select_own
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own profile history
CREATE POLICY user_profile_history_select_own
  ON public.user_profile_history FOR SELECT
  USING (user_id = auth.uid());
