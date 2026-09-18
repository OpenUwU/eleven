CREATE TABLE IF NOT EXISTS guilds (
  id                              TEXT        PRIMARY KEY,
  prefixes                        JSONB       NOT NULL DEFAULT '[]',
  avatar_updated_at               TIMESTAMPTZ,
  banner_updated_at               TIMESTAMPTZ,
  bio_updated_at                  TIMESTAMPTZ,
  is_custom_profile               BOOLEAN     NOT NULL DEFAULT false,
  request_channel_id              TEXT,
  request_message_id              TEXT,
  ignored_channels                JSONB       NOT NULL DEFAULT '[]',
  default_volume                  INTEGER     NOT NULL DEFAULT 100,
  twenty_four_seven               BOOLEAN     NOT NULL DEFAULT false,
  twenty_four_seven_text_channel  TEXT,
  twenty_four_seven_voice_channel TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
