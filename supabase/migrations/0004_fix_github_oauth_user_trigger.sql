alter table public.users
  alter column github_id drop not null,
  alter column github_username drop not null;

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

  insert into public.users (id, github_id, github_username, avatar_url, email)
  values (new.id, v_github_id, v_github_username, v_avatar_url, new.email)
  on conflict (id) do update set
    github_id = coalesce(excluded.github_id, public.users.github_id),
    github_username = coalesce(excluded.github_username, public.users.github_username),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    email = coalesce(excluded.email, public.users.email),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

create or replace function public.handle_github_identity_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_github_username text;
  v_avatar_url text;
  v_email text;
begin
  if new.provider <> 'github' then
    return new;
  end if;

  v_github_username :=
    coalesce(
      new.identity_data->>'user_name',
      new.identity_data->>'preferred_username',
      new.identity_data->>'login'
    );

  v_avatar_url :=
    coalesce(
      new.identity_data->>'avatar_url',
      new.identity_data->>'picture'
    );

  select email into v_email
  from auth.users
  where id = new.user_id;

  insert into public.users (id, github_id, github_username, avatar_url, email)
  values (new.user_id, (new.provider_id)::bigint, v_github_username, v_avatar_url, v_email)
  on conflict (id) do update set
    github_id = coalesce(excluded.github_id, public.users.github_id),
    github_username = coalesce(excluded.github_username, public.users.github_username),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    email = coalesce(excluded.email, public.users.email),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_github_identity_upsert() from public;
grant execute on function public.handle_github_identity_upsert() to supabase_auth_admin, service_role;

drop trigger if exists on_auth_identity_created on auth.identities;
create trigger on_auth_identity_created
after insert on auth.identities
for each row execute function public.handle_github_identity_upsert();

