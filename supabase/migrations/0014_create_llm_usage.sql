-- LLM Usage tracking table for analytics and free tier limits

create table if not exists public.llm_usage (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.analysis_jobs(id) on delete set null,
  repo_id uuid references public.repos(id) on delete set null,

  -- What was used
  provider text not null check (provider in ('anthropic', 'openai', 'gemini')),
  model text not null,
  key_source text not null check (key_source in ('platform', 'user', 'sponsor')),

  -- Token counts
  input_tokens integer,
  output_tokens integer,

  -- Status
  success boolean not null,
  error_message text,

  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.llm_usage enable row level security;

-- Users can view their own usage
create policy llm_usage_select_own
  on public.llm_usage
  for select
  using (user_id = auth.uid());

-- Admins can view all usage (for platform analytics)
create policy llm_usage_admin_select
  on public.llm_usage
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Create indexes for common queries
create index if not exists llm_usage_user_id_idx on public.llm_usage (user_id);
create index if not exists llm_usage_repo_id_idx on public.llm_usage (repo_id);
create index if not exists llm_usage_created_at_idx on public.llm_usage (created_at);
create index if not exists llm_usage_key_source_idx on public.llm_usage (key_source);

-- Function to count free tier usage for a user+repo combo
create or replace function public.count_free_llm_analyses(p_user_id uuid, p_repo_id uuid)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.llm_usage
  where user_id = p_user_id
    and repo_id = p_repo_id
    and key_source = 'platform'
    and success = true;
$$;

-- Add columns to analysis_reports for tracking LLM source
alter table public.analysis_reports
  add column if not exists llm_key_source text
    check (llm_key_source in ('platform', 'user', 'sponsor', 'none')),
  add column if not exists llm_input_tokens integer,
  add column if not exists llm_output_tokens integer;

-- Add comments
comment on table public.llm_usage is 'Tracks LLM API usage for analytics and free tier enforcement';
comment on column public.llm_usage.key_source is 'Source of the API key used: platform (free tier), user (BYOK), sponsor';
comment on function public.count_free_llm_analyses is 'Count successful LLM analyses using platform key for a user+repo combo';
