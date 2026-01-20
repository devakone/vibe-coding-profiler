create table if not exists public.analysis_insights (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs (id) on delete cascade,
  insights_json jsonb not null,
  generator_version text not null default '0.1.0',
  generated_at timestamptz not null default now(),
  unique (job_id)
);

alter table public.analysis_insights enable row level security;

create policy analysis_insights_select_own
  on public.analysis_insights
  for select
  using (
    exists (
      select 1
      from public.analysis_jobs j
      where j.id = analysis_insights.job_id
        and j.user_id = auth.uid()
    )
  );

create index if not exists analysis_insights_job_id_idx
  on public.analysis_insights (job_id);

