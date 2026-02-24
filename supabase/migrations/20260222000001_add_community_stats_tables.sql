-- Community Stats: snapshot + rollup tables for anonymized aggregate metrics.
-- See docs/prd/platform/prd-community-stats.md for full specification.

--------------------------------------------------------------------------------
-- 1. community_profile_snapshots: one row per user, latest snapshot only
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_profile_snapshots (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_eligible BOOLEAN NOT NULL DEFAULT false,
  total_commits INTEGER NOT NULL DEFAULT 0,
  total_repos INTEGER NOT NULL DEFAULT 0,
  persona_id TEXT NOT NULL,
  persona_confidence TEXT NOT NULL,
  persona_score INTEGER NOT NULL DEFAULT 0,
  automation_heaviness INTEGER NOT NULL DEFAULT 0,
  guardrail_strength INTEGER NOT NULL DEFAULT 0,
  iteration_loop_intensity INTEGER NOT NULL DEFAULT 0,
  planning_signal INTEGER NOT NULL DEFAULT 0,
  surface_area_per_change INTEGER NOT NULL DEFAULT 0,
  shipping_rhythm INTEGER NOT NULL DEFAULT 0,
  ai_collaboration_rate REAL,
  ai_tool_diversity INTEGER,
  ai_tools_detected BOOLEAN,
  source_version TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only: enable RLS with no policies (implicit deny for all roles).
ALTER TABLE public.community_profile_snapshots ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 2. community_rollups: precomputed JSON payloads for the public API
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rollup_window TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  payload_json JSONB NOT NULL,
  eligible_profiles INTEGER NOT NULL DEFAULT 0,
  source_version TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only: enable RLS with no policies.
ALTER TABLE public.community_rollups ENABLE ROW LEVEL SECURITY;

-- Fast lookup: latest rollup by window type.
CREATE INDEX idx_community_rollups_window_date
  ON public.community_rollups (rollup_window, as_of_date DESC);
