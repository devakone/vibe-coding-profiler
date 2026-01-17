create table if not exists public.user_action_rate_limits (
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  window_seconds integer not null,
  window_key bigint not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, action, window_seconds, window_key)
);

alter table public.user_action_rate_limits enable row level security;

drop trigger if exists user_action_rate_limits_set_updated_at on public.user_action_rate_limits;
create trigger user_action_rate_limits_set_updated_at
before update on public.user_action_rate_limits
for each row execute function public.set_updated_at();

create or replace function public.consume_user_action_rate_limit(
  p_user_id uuid,
  p_action text,
  p_window_seconds integer,
  p_max_count integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_key bigint;
  v_next_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_window_seconds <= 0 then
    raise exception 'invalid_window_seconds';
  end if;

  if p_max_count <= 0 then
    raise exception 'invalid_max_count';
  end if;

  v_window_key := floor(extract(epoch from now()) / p_window_seconds);

  insert into public.user_action_rate_limits (user_id, action, window_seconds, window_key, count)
  values (p_user_id, p_action, p_window_seconds, v_window_key, 1)
  on conflict (user_id, action, window_seconds, window_key)
  do update set
    count = public.user_action_rate_limits.count + 1,
    updated_at = now()
  returning count into v_next_count;

  return v_next_count <= p_max_count;
end;
$$;

revoke all on function public.consume_user_action_rate_limit(uuid, text, integer, integer) from public;
revoke all on function public.consume_user_action_rate_limit(uuid, text, integer, integer) from anon;
revoke all on function public.consume_user_action_rate_limit(uuid, text, integer, integer) from authenticated;

grant execute on function public.consume_user_action_rate_limit(uuid, text, integer, integer) to service_role;

