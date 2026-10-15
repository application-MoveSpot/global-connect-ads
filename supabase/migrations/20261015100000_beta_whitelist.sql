-- Table de liste blanche pour l'accès beta
CREATE TABLE IF NOT EXISTS beta_whitelist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  note text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE beta_whitelist ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent lire (BetaGuard vérifie après connexion)
CREATE POLICY "Authenticated can read beta whitelist"
  ON beta_whitelist FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent gérer la liste
CREATE POLICY "Admin can manage beta whitelist"
  ON beta_whitelist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed : emails initiaux (depuis l'ancienne whitelist codée en dur)
INSERT INTO beta_whitelist (email, note) VALUES
  ('rakounklub@gmail.com', 'Admin principal'),
  ('palermegarry.gp@gmail.com', 'Compte test')
ON CONFLICT (email) DO NOTHING;
