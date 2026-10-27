-- Public API keys for external AI assistants (ChatGPT Actions, Claude MCP, etc.)
-- The raw key is never stored — only its SHA-256 hash.

CREATE TABLE public.api_keys (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash    text        NOT NULL UNIQUE,
  key_prefix  text        NOT NULL,        -- first 12 chars for display, e.g. "ms_a1b2c3d4"
  name        text        NOT NULL DEFAULT 'Clé API',
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);

CREATE INDEX api_keys_user_id_idx  ON public.api_keys (user_id);
CREATE INDEX api_keys_key_hash_idx ON public.api_keys (key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert_own"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_update_own"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "api_keys_delete_own"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);
