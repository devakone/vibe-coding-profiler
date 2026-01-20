alter table public.repos
  add column if not exists last_pr_sync_at timestamptz;

create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos (id) on delete cascade,
  github_pr_number integer not null,
  title text not null,
  body text,
  state text not null,
  merged boolean not null default false,
  merged_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  closed_at timestamptz,
  author_login text,
  base_ref text,
  head_ref text,
  head_sha text,
  merge_commit_sha text,
  commit_count integer,
  additions integer,
  deletions integer,
  changed_files integer,
  comments_count integer not null default 0,
  review_comments_count integer not null default 0,
  linked_issue_numbers integer[] not null default '{}'::integer[],
  has_checklist boolean not null default false,
  has_template_markers boolean not null default false,
  merge_method text,
  unique (repo_id, github_pr_number)
);

create index if not exists pull_requests_repo_id_created_at_idx
  on public.pull_requests (repo_id, created_at desc);

create index if not exists pull_requests_repo_id_updated_at_idx
  on public.pull_requests (repo_id, updated_at desc);

alter table public.pull_requests enable row level security;

create policy pull_requests_select_connected
  on public.pull_requests
  for select
  using (
    exists (
      select 1
      from public.user_repos ur
      where ur.repo_id = pull_requests.repo_id
        and ur.user_id = auth.uid()
        and ur.disconnected_at is null
    )
  );

drop trigger if exists pull_requests_set_updated_at on public.pull_requests;
create trigger pull_requests_set_updated_at
before update on public.pull_requests
for each row execute function public.set_updated_at();
