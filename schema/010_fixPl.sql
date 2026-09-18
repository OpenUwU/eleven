DROP TABLE IF EXISTS playlist_collaborators;

ALTER TABLE playlists DROP COLUMN IF EXISTS is_collaborative;
