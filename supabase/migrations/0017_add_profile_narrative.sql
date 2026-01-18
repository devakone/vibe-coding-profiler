-- Add profile LLM repo limit to platform settings
-- This controls how many repos with LLM-generated reports can contribute
-- to an LLM-generated aggregated Vibed profile (default: 3)
ALTER TABLE public.llm_configs
ADD COLUMN IF NOT EXISTS profile_llm_repo_limit INTEGER DEFAULT 3;

COMMENT ON COLUMN public.llm_configs.profile_llm_repo_limit IS
  'Max repos with LLM reports that can use LLM for profile aggregation (platform scope only)';

-- Add LLM narrative fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS narrative_json JSONB,
ADD COLUMN IF NOT EXISTS llm_model TEXT,
ADD COLUMN IF NOT EXISTS llm_key_source TEXT,
ADD COLUMN IF NOT EXISTS regenerating BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for checking regeneration status
CREATE INDEX IF NOT EXISTS user_profiles_regenerating_idx
  ON public.user_profiles(user_id) WHERE regenerating = TRUE;

-- Add version column to profile history for easier ordering/display
ALTER TABLE public.user_profile_history
ADD COLUMN IF NOT EXISTS version_number INTEGER,
ADD COLUMN IF NOT EXISTS llm_model TEXT,
ADD COLUMN IF NOT EXISTS llm_key_source TEXT;

-- Function to auto-increment version number
CREATE OR REPLACE FUNCTION public.set_profile_history_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version_number := COALESCE(
    (SELECT MAX(version_number) + 1 FROM public.user_profile_history WHERE user_id = NEW.user_id),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set version number on insert
DROP TRIGGER IF EXISTS set_profile_history_version_trigger ON public.user_profile_history;
CREATE TRIGGER set_profile_history_version_trigger
  BEFORE INSERT ON public.user_profile_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_history_version();

-- Backfill existing history rows with version numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM public.user_profile_history
  WHERE version_number IS NULL
)
UPDATE public.user_profile_history h
SET version_number = n.rn
FROM numbered n
WHERE h.id = n.id;
