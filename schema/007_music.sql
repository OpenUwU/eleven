CREATE TABLE IF NOT EXISTS music (
  id                     TEXT    PRIMARY KEY,
  history                JSONB   NOT NULL DEFAULT '[]',
  history_enabled        BOOLEAN NOT NULL DEFAULT true,
  favorites              JSONB   NOT NULL DEFAULT '[]',
  spotify_profile_url    TEXT,
  spotify_public_profile BOOLEAN NOT NULL DEFAULT false
);
