CREATE TABLE IF NOT EXISTS user_premium (
  id                 TEXT        PRIMARY KEY,
  tier               TEXT        NOT NULL,
  no_prefix_enabled  BOOLEAN     NOT NULL DEFAULT false,
  is_active          BOOLEAN     NOT NULL DEFAULT false,
  activated_at       TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ NOT NULL,
  server_activations INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
