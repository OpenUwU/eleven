CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT        NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  encoded     TEXT        NOT NULL,
  position    INTEGER     NOT NULL,
  added_by    TEXT        NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, encoded)
);

CREATE INDEX IF NOT EXISTS plt_pos_idx ON playlist_tracks (playlist_id, position);

