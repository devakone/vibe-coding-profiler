-- Backfill platform user info from users table
UPDATE platform_connections pc
SET
  platform_user_id = u.github_id::text,
  platform_username = u.github_username,
  platform_email = u.email,
  platform_avatar_url = u.avatar_url,
  is_primary = true
FROM users u
WHERE pc.user_id = u.id
  AND pc.platform = 'github';
