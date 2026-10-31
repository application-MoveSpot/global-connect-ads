-- Create provider enum
CREATE TYPE provider_name_enum AS ENUM ('openai', 'anthropic', 'xai', 'google');

-- user_api_keys: stores hashed external provider API keys (raw key never stored)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name   provider_name_enum NOT NULL,
  key_hash        CHAR(64) NOT NULL, -- SHA-256 hex, 64 chars
  key_prefix      VARCHAR(12) NOT NULL, -- first 7-10 chars for display
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_tested_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_api_keys_unique_key UNIQUE (user_id, key_hash)
);

-- One active key per provider per user
CREATE UNIQUE INDEX user_api_keys_one_active_per_provider
  ON user_api_keys (user_id, provider_name)
  WHERE is_active = true;

CREATE INDEX user_api_keys_user_id_idx ON user_api_keys (user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_select" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_api_keys_insert" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_api_keys_update" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_api_keys_delete" ON user_api_keys
  FOR DELETE USING (auth.uid() = user_id);
