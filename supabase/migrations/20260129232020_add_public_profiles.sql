-- Public Profiles: username system, privacy settings, and RLS for public access
-- Enables shareable profile pages at /u/{username}

--------------------------------------------------------------------------------
-- 1a. Add username column to public.users
--------------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE public.users ADD CONSTRAINT users_username_format
CHECK (
  username IS NULL OR (
    length(username) >= 3 AND length(username) <= 39 AND
    username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND
    username NOT LIKE '%--%'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx
  ON public.users(username) WHERE username IS NOT NULL;

--------------------------------------------------------------------------------
-- 1b. Add public_profile_settings JSONB column
--------------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS public_profile_settings JSONB NOT NULL DEFAULT '{
  "profile_enabled": false,
  "show_persona": true,
  "show_tagline": true,
  "show_confidence": true,
  "show_axes_chart": true,
  "show_style_descriptor": true,
  "show_total_repos": true,
  "show_total_commits": true,
  "show_narrative": false,
  "show_insight_cards": false,
  "show_repo_breakdown": false,
  "show_repo_names": false,
  "show_peak_time": false,
  "show_shipping_rhythm": false,
  "show_near_miss_personas": false,
  "show_avatar": true
}'::jsonb;

--------------------------------------------------------------------------------
-- 1c. Reserved usernames table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'reserved'
);

ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- No public access to reserved usernames table (service role only)
CREATE POLICY reserved_usernames_service_only
  ON public.reserved_usernames FOR SELECT
  USING (false);

-- Seed reserved usernames (app routes, system words, common terms)
INSERT INTO public.reserved_usernames (username, reason) VALUES
  ('admin', 'app_route'),
  ('api', 'app_route'),
  ('app', 'app_route'),
  ('auth', 'app_route'),
  ('callback', 'app_route'),
  ('dashboard', 'app_route'),
  ('login', 'app_route'),
  ('logout', 'app_route'),
  ('settings', 'app_route'),
  ('signup', 'app_route'),
  ('vibes', 'app_route'),
  ('repos', 'app_route'),
  ('profile', 'app_route'),
  ('public', 'app_route'),
  ('share', 'app_route'),
  ('about', 'app_route'),
  ('help', 'app_route'),
  ('support', 'app_route'),
  ('terms', 'app_route'),
  ('privacy', 'app_route'),
  ('blog', 'app_route'),
  ('docs', 'app_route'),
  ('status', 'app_route'),
  ('pricing', 'app_route'),
  ('u', 'app_route'),
  ('undefined', 'system'),
  ('null', 'system'),
  ('root', 'system'),
  ('system', 'system'),
  ('bot', 'system'),
  ('vibed', 'brand'),
  ('vibedcoding', 'brand'),
  ('vibe-coding', 'brand'),
  ('bolokonon', 'brand'),
  ('vcp', 'brand')
ON CONFLICT (username) DO NOTHING;

--------------------------------------------------------------------------------
-- 1d. RLS policies for public read access
--------------------------------------------------------------------------------

-- Public can read users with an enabled public profile
CREATE POLICY users_select_public_profile
  ON public.users FOR SELECT
  USING (
    username IS NOT NULL
    AND (public_profile_settings->>'profile_enabled')::boolean = true
  );

-- Public can read user_profiles for users with an enabled public profile
CREATE POLICY user_profiles_select_public
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_profiles.user_id
        AND u.username IS NOT NULL
        AND (u.public_profile_settings->>'profile_enabled')::boolean = true
    )
  );

-- Public can read vibe_insights for users with an enabled public profile
CREATE POLICY vibe_insights_select_public
  ON public.vibe_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_jobs j
      JOIN public.users u ON u.id = j.user_id
      WHERE j.id = vibe_insights.job_id
        AND u.username IS NOT NULL
        AND (u.public_profile_settings->>'profile_enabled')::boolean = true
    )
  );

-- Public can read analysis_insights for users with an enabled public profile
CREATE POLICY analysis_insights_select_public
  ON public.analysis_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_jobs j
      JOIN public.users u ON u.id = j.user_id
      WHERE j.id = analysis_insights.job_id
        AND u.username IS NOT NULL
        AND (u.public_profile_settings->>'profile_enabled')::boolean = true
    )
  );

-- Public can read repos belonging to users with an enabled public profile
CREATE POLICY repos_select_public
  ON public.repos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_repos ur
      JOIN public.users u ON u.id = ur.user_id
      WHERE ur.repo_id = repos.id
        AND ur.disconnected_at IS NULL
        AND u.username IS NOT NULL
        AND (u.public_profile_settings->>'profile_enabled')::boolean = true
    )
  );

-- Public can read analysis_jobs for users with an enabled public profile
CREATE POLICY analysis_jobs_select_public
  ON public.analysis_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = analysis_jobs.user_id
        AND u.username IS NOT NULL
        AND (u.public_profile_settings->>'profile_enabled')::boolean = true
    )
  );

--------------------------------------------------------------------------------
-- 1e. Backfill existing users with username from github_username
--------------------------------------------------------------------------------
UPDATE public.users
SET username = lower(github_username)
WHERE username IS NULL
  AND github_username IS NOT NULL
  AND length(lower(github_username)) >= 3
  AND length(lower(github_username)) <= 39
  AND lower(github_username) ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
  AND lower(github_username) NOT LIKE '%--%'
  AND lower(github_username) NOT IN (SELECT ru.username FROM public.reserved_usernames ru);

--------------------------------------------------------------------------------
-- 1f. Update handle_new_user() trigger to auto-populate username
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_github_id bigint;
  v_github_username text;
  v_avatar_url text;
  v_candidate_username text;
BEGIN
  SELECT (provider_id)::bigint
    INTO v_github_id
  FROM auth.identities
  WHERE user_id = new.id
    AND provider = 'github'
  LIMIT 1;

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

  -- Compute candidate username from GitHub username
  v_candidate_username := NULL;
  IF v_github_username IS NOT NULL AND length(lower(v_github_username)) >= 3 THEN
    v_candidate_username := lower(v_github_username);
    -- Validate format
    IF NOT (
      length(v_candidate_username) <= 39
      AND v_candidate_username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
      AND v_candidate_username NOT LIKE '%--%'
    ) THEN
      v_candidate_username := NULL;
    END IF;
    -- Check reserved
    IF v_candidate_username IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.reserved_usernames WHERE username = v_candidate_username
    ) THEN
      v_candidate_username := NULL;
    END IF;
    -- Check uniqueness
    IF v_candidate_username IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users WHERE username = v_candidate_username AND id != new.id
    ) THEN
      v_candidate_username := NULL;
    END IF;
  END IF;

  INSERT INTO public.users (id, github_id, github_username, avatar_url, email, username)
  VALUES (new.id, v_github_id, v_github_username, v_avatar_url, new.email, v_candidate_username)
  ON CONFLICT (id) DO UPDATE SET
    github_id = coalesce(excluded.github_id, public.users.github_id),
    github_username = coalesce(excluded.github_username, public.users.github_username),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    email = coalesce(excluded.email, public.users.email),
    -- Only set username if current is NULL (don't overwrite user's chosen username)
    username = CASE
      WHEN public.users.username IS NULL THEN excluded.username
      ELSE public.users.username
    END,
    updated_at = now();

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role;
