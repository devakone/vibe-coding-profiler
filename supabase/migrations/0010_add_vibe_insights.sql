create table if not exists public.vibe_insights (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs (id) on delete cascade,

  version text not null,

  axes_json jsonb not null default '{}'::jsonb,

  persona_id text not null,
  persona_name text not null,
  persona_tagline text,
  persona_confidence text not null,
  persona_score integer not null default 0,

  cards_json jsonb,
  evidence_json jsonb,

  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (job_id)
);

create index if not exists vibe_insights_job_id_idx
  on public.vibe_insights (job_id);

alter table public.vibe_insights enable row level security;

create policy vibe_insights_select_own
  on public.vibe_insights
  for select
  using (
    exists (
      select 1
      from public.analysis_jobs j
      where j.id = vibe_insights.job_id
        and j.user_id = auth.uid()
    )
  );

drop trigger if exists vibe_insights_set_updated_at on public.vibe_insights;
create trigger vibe_insights_set_updated_at
before update on public.vibe_insights
for each row execute function public.set_updated_at();

