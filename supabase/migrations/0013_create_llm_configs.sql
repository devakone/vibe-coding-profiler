-- LLM Configuration table for storing user API keys
-- Supports platform-wide, user-specific, and sponsor-level configurations

create table if not exists public.llm_configs (
  id uuid primary key default gen_random_uuid(),

  -- Config scope: 'platform' (global default), 'user' (user's own key), 'sponsor' (company-sponsored)
  scope text not null check (scope in ('platform', 'user', 'sponsor')),
  -- For 'user' scope: user_id, for 'sponsor': sponsor org id, for 'platform': null
  scope_id uuid,

  -- Provider settings
  provider text not null check (provider in ('anthropic', 'openai', 'gemini')),
  api_key_encrypted text not null,
  model text, -- Optional: preferred model override

  -- Metadata
  label text, -- User-friendly name, e.g., "My Anthropic Key"
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One active key per provider per scope
  unique (scope, scope_id, provider)
);

-- Enable RLS
alter table public.llm_configs enable row level security;

-- Users can view their own configs
create policy llm_configs_select_own
  on public.llm_configs
  for select
  using (
    scope = 'user' and scope_id = auth.uid()
  );

-- Users can insert their own configs
create policy llm_configs_insert_own
  on public.llm_configs
  for insert
  with check (
    scope = 'user' and scope_id = auth.uid()
  );

-- Users can update their own configs
create policy llm_configs_update_own
  on public.llm_configs
  for update
  using (
    scope = 'user' and scope_id = auth.uid()
  );

-- Users can delete their own configs
create policy llm_configs_delete_own
  on public.llm_configs
  for delete
  using (
    scope = 'user' and scope_id = auth.uid()
  );

-- Admins can view platform configs (but not see the actual keys - handled at API level)
create policy llm_configs_admin_select_platform
  on public.llm_configs
  for select
  using (
    scope = 'platform'
    and exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Create index for faster lookups
create index if not exists llm_configs_scope_idx on public.llm_configs (scope, scope_id);
create index if not exists llm_configs_user_idx on public.llm_configs (scope_id) where scope = 'user';

-- Add trigger for updated_at
create or replace function public.update_llm_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger llm_configs_updated_at
  before update on public.llm_configs
  for each row
  execute function public.update_llm_configs_updated_at();

-- Add comments
comment on table public.llm_configs is 'Stores encrypted LLM API keys for users and platform configuration';
comment on column public.llm_configs.scope is 'Config scope: platform (global), user (per-user), sponsor (company-sponsored)';
comment on column public.llm_configs.api_key_encrypted is 'AES-256-GCM encrypted API key - never exposed to clients';
