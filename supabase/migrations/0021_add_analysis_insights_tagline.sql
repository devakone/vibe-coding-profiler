-- Add tagline column for LLM-generated share card taglines
-- The `tagline` column is the authoritative source; share_template.tagline
-- and insights_json.share_template.tagline are also updated for compatibility.
alter table public.analysis_insights
  add column if not exists tagline text;

comment on column public.analysis_insights.tagline is 'LLM-generated tagline for share cards (<=60 chars, fallbacks to persona description)';

-- DOWN: alter table public.analysis_insights drop column if exists tagline;
