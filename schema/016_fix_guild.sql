ALTER TABLE guilds
  DROP COLUMN IF EXISTS avatar_updated_at,
  DROP COLUMN IF EXISTS banner_updated_at,
  DROP COLUMN IF EXISTS bio_updated_at,
  DROP COLUMN IF EXISTS is_custom_profile,
  DROP COLUMN IF EXISTS request_channel_id,
  DROP COLUMN IF EXISTS request_message_id,
  DROP COLUMN IF EXISTS ignored_channels;
