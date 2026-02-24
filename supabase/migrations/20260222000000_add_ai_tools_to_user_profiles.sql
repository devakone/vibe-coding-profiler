-- Persist aggregated AI tool metrics to user_profiles.
-- aggregateUserProfile() already computes AIToolMetrics but it was not being saved.
-- This unblocks community stats (Section 4F) and public profile AI tool display.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_tools_json JSONB DEFAULT NULL;
