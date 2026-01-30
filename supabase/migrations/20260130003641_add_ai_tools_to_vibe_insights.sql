-- Add AI tools metrics column to vibe_insights
ALTER TABLE public.vibe_insights
ADD COLUMN IF NOT EXISTS ai_tools_json JSONB DEFAULT NULL;

COMMENT ON COLUMN public.vibe_insights.ai_tools_json IS
  'AI coding tool metrics: detected tools, collaboration rate, per-tool breakdown';
