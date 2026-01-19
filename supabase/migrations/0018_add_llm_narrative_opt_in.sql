-- Add LLM narrative opt-in setting for users
-- Default is false (opt-out) - users must explicitly consent to LLM narrative generation

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS llm_narrative_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Add a comment explaining the column
COMMENT ON COLUMN public.users.llm_narrative_opt_in IS 'Whether user has opted in to LLM-generated narratives. Default false for privacy - user must explicitly consent.';
