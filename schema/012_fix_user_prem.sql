ALTER TABLE user_premium
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS expires_at;
