create table if not exists public.github_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  github_user_id bigint not null,
  encrypted_token text not null,
  scopes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (github_user_id)
);

alter table public.github_accounts enable row level security;

drop trigger if exists github_accounts_set_updated_at on public.github_accounts;
create trigger github_accounts_set_updated_at
before update on public.github_accounts
for each row execute function public.set_updated_at();

create policy github_accounts_select_own
  on public.github_accounts
  for select
  using (user_id = auth.uid());

create policy github_accounts_insert_own
  on public.github_accounts
  for insert
  with check (user_id = auth.uid());

create policy github_accounts_update_own
  on public.github_accounts
  for update
  using (user_id = auth.uid());

