alter table public.analysis_insights
  add column if not exists persona_id text,
  add column if not exists persona_label text,
  add column if not exists persona_confidence text,
  add column if not exists tech_signals jsonb default '{}'::jsonb not null,
  add column if not exists share_template jsonb default '{}'::jsonb not null,
  add column if not exists persona_delta jsonb default '[]'::jsonb not null,
  add column if not exists sources jsonb default '[]'::jsonb not null;

create index if not exists analysis_insights_persona_id_idx
  on public.analysis_insights (persona_id);

comment on column public.analysis_insights.persona_id is 'detected persona identifier (e.g., spec-architect)';
comment on column public.analysis_insights.persona_label is 'human label for the persona';
comment on column public.analysis_insights.persona_confidence is 'confidence level for persona detection (high/medium/low)';
comment on column public.analysis_insights.tech_signals is 'summary of detected tech signals (languages, extensions, config files)';
comment on column public.analysis_insights.share_template is 'data driver for share cards (colors, hero copy, highlights)';
comment on column public.analysis_insights.persona_delta is 'history of persona evolution notices for this job';
comment on column public.analysis_insights.sources is 'list of research/logic sources included in the insights';
