
CREATE TABLE IF NOT EXISTS playlists (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  track_count INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pl_user_idx ON playlists (user_id);

