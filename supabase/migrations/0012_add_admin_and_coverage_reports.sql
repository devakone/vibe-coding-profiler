-- Add admin role to users
alter table public.users add column if not exists is_admin boolean not null default false;

-- Create persona coverage reports table for tracking persona rule effectiveness
create table if not exists public.persona_coverage_reports (
  id uuid primary key default gen_random_uuid(),
  total_combinations integer not null,
  fallback_count integer not null,
  fallback_percentage integer not null,
  persona_counts jsonb not null,
  sample_fallbacks jsonb not null,
  -- Track real user fallback patterns (users with high data quality who hit fallback)
  real_user_fallbacks jsonb not null default '[]'::jsonb,
  step_size integer not null default 20,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  notes text
);

-- Enable RLS
alter table public.persona_coverage_reports enable row level security;

-- Only admins can view coverage reports
create policy persona_coverage_reports_select_admin
  on public.persona_coverage_reports
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Only service role can insert (via server actions)
-- No insert policy for regular users

-- Create a function to check if current user is admin
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

-- Create index for faster admin lookups
create index if not exists users_is_admin_idx on public.users (is_admin) where is_admin = true;

-- Add comment for documentation
comment on column public.users.is_admin is 'Whether the user has admin privileges to access diagnostic tools';
comment on table public.persona_coverage_reports is 'Stores periodic reports on persona rule coverage to track how well personas match user patterns';
