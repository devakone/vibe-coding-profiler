-- Add platform-level LLM settings to llm_configs

alter table public.llm_configs
  add column if not exists free_tier_limit integer,
  add column if not exists llm_disabled boolean not null default false;

comment on column public.llm_configs.free_tier_limit is 'Free LLM analyses per repo (platform scope only)';
comment on column public.llm_configs.llm_disabled is 'Disable LLM features globally (platform scope only)';
