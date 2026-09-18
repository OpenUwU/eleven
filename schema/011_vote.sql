CREATE TABLE IF NOT EXISTS user_votes (
  id                TEXT        PRIMARY KEY,  
  topgg_user_id     TEXT,                     
  last_vote_id      TEXT,                     
  last_voted_at     TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,    
  last_weight       INTEGER     NOT NULL DEFAULT 1,
  vote_count        INTEGER     NOT NULL DEFAULT 0, 
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_votes_expires_at_idx ON user_votes (expires_at);
