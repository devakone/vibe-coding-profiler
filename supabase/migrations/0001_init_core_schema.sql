create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  github_id bigint unique not null,
  github_username text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  github_id bigint unique not null,
  owner text not null,
  name text not null,
  full_name text unique not null,
  is_private boolean not null default false,
  default_branch text not null default 'main',
  created_at timestamptz not null default now()
);

create table if not exists public.user_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  settings_json jsonb not null default '{}'::jsonb,
  unique (user_id, repo_id)
);

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  status text not null default 'queued',
  commit_count integer,
  analyzer_version text not null default '0.1.0',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists analysis_jobs_status_created_at_idx
  on public.analysis_jobs (status, created_at);

create table if not exists public.analysis_metrics (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs (id) on delete cascade,
  metrics_json jsonb not null,
  events_json jsonb not null,
  computed_at timestamptz not null default now(),
  unique (job_id)
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs (id) on delete cascade,
  bolokono_type text,
  narrative_json jsonb not null,
  evidence_json jsonb not null,
  llm_model text not null default 'none',
  generated_at timestamptz not null default now(),
  unique (job_id)
);

alter table public.users enable row level security;
alter table public.repos enable row level security;
alter table public.user_repos enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analysis_metrics enable row level security;
alter table public.analysis_reports enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_github_id bigint;
  v_github_username text;
  v_avatar_url text;
begin
  select (provider_id)::bigint
    into v_github_id
  from auth.identities
  where user_id = new.id
    and provider = 'github'
  limit 1;

  v_github_username :=
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'login'
    );

  v_avatar_url :=
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    );

  if v_github_id is null then
    raise exception 'Missing GitHub identity for user %', new.id;
  end if;

  if v_github_username is null or length(trim(v_github_username)) = 0 then
    raise exception 'Missing GitHub username for user %', new.id;
  end if;

  insert into public.users (id, github_id, github_username, avatar_url, email)
  values (new.id, v_github_id, v_github_username, v_avatar_url, new.email)
  on conflict (id) do update set
    github_id = excluded.github_id,
    github_username = excluded.github_username,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy users_select_own
  on public.users
  for select
  using (id = auth.uid());

create policy users_update_own
  on public.users
  for update
  using (id = auth.uid());

create policy user_repos_select_own
  on public.user_repos
  for select
  using (user_id = auth.uid());

create policy user_repos_insert_own
  on public.user_repos
  for insert
  with check (user_id = auth.uid());

create policy user_repos_update_own
  on public.user_repos
  for update
  using (user_id = auth.uid());

create policy repos_select_connected
  on public.repos
  for select
  using (
    exists (
      select 1
      from public.user_repos ur
      where ur.repo_id = repos.id
        and ur.user_id = auth.uid()
        and ur.disconnected_at is null
    )
  );

create policy analysis_jobs_select_own
  on public.analysis_jobs
  for select
  using (user_id = auth.uid());

create policy analysis_jobs_insert_own
  on public.analysis_jobs
  for insert
  with check (user_id = auth.uid());

create policy analysis_jobs_update_own
  on public.analysis_jobs
  for update
  using (user_id = auth.uid());

create policy analysis_metrics_select_own
  on public.analysis_metrics
  for select
  using (
    exists (
      select 1
      from public.analysis_jobs j
      where j.id = analysis_metrics.job_id
        and j.user_id = auth.uid()
    )
  );

create policy analysis_reports_select_own
  on public.analysis_reports
  for select
  using (
    exists (
      select 1
      from public.analysis_jobs j
      where j.id = analysis_reports.job_id
        and j.user_id = auth.uid()
    )
  );

create or replace function public.claim_analysis_job(p_analyzer_version text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  select id
    into v_job_id
  from public.analysis_jobs
  where status = 'queued'
  order by created_at asc
  for update skip locked
  limit 1;

  if v_job_id is not null then
    update public.analysis_jobs
    set status = 'running',
        started_at = now(),
        analyzer_version = p_analyzer_version
    where id = v_job_id;
  end if;

  return v_job_id;
end;
$$;

