-- Skills system: many-to-many between vehicles/drivers and a skill catalog.
-- Revenue boost column exists so the UI can honestly show "activate this, earn more".

CREATE TABLE public.skills (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT    UNIQUE NOT NULL,          -- e.g. 'vehicule:electrique'
  label       TEXT    NOT NULL,                 -- e.g. 'Véhicule Électrique'
  category    TEXT    NOT NULL                  -- 'vehicule' | 'chauffeur' | 'espace-pub'
              CHECK (category IN ('vehicule', 'chauffeur', 'espace-pub')),
  description TEXT,
  icon        TEXT,                             -- lucide icon name
  revenue_boost_pct INTEGER DEFAULT 0,         -- shown as "+15% de revenus en moyenne"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_skills (
  vehicle_id  UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  skill_id    UUID REFERENCES public.skills(id)   ON DELETE CASCADE,
  verified_at TIMESTAMPTZ,                       -- admin can mark skills as verified
  PRIMARY KEY (vehicle_id, skill_id)
);

CREATE TABLE public.driver_skills (
  driver_id   UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  skill_id    UUID REFERENCES public.skills(id)  ON DELETE CASCADE,
  verified_at TIMESTAMPTZ,
  PRIMARY KEY (driver_id, skill_id)
);

-- Index for fast fleet filtering
CREATE INDEX vehicle_skills_vehicle_idx ON public.vehicle_skills(vehicle_id);
CREATE INDEX vehicle_skills_skill_idx   ON public.vehicle_skills(skill_id);
CREATE INDEX driver_skills_driver_idx   ON public.driver_skills(driver_id);
CREATE INDEX driver_skills_skill_idx    ON public.driver_skills(skill_id);

-- Grants
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.vehicle_skills TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.driver_skills  TO authenticated;
GRANT ALL ON public.skills, public.vehicle_skills, public.driver_skills TO service_role;

-- RLS
ALTER TABLE public.skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_skills  ENABLE ROW LEVEL SECURITY;

-- Skills catalog is public read
CREATE POLICY "skills_public_read" ON public.skills
  FOR SELECT USING (true);

-- Only admins can create skills
CREATE POLICY "skills_admin_insert" ON public.skills
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Vehicle skills: owner manages their own vehicles' skills
CREATE POLICY "vehicle_skills_owner_read" ON public.vehicle_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id AND op.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vehicle_skills_owner_write" ON public.vehicle_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id AND op.user_id = auth.uid()
    )
  );

-- Driver skills: owner manages their drivers' skills
CREATE POLICY "driver_skills_owner_read" ON public.driver_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      JOIN public.owner_profiles op ON op.id = d.owner_id
      WHERE d.id = driver_id AND op.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "driver_skills_owner_write" ON public.driver_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      JOIN public.owner_profiles op ON op.id = d.owner_id
      WHERE d.id = driver_id AND op.user_id = auth.uid()
    )
  );

-- ─── Seed: 15 skills in 3 categories ───────────────────────────────────────
INSERT INTO public.skills (slug, label, category, description, icon, revenue_boost_pct) VALUES

-- Véhicule
('vehicule:electrique',    'Électrique / Hybride',    'vehicule', 'Véhicule 0 émission ou hybride rechargeable', 'Zap',          12),
('vehicule:zfe-certifie',  'Certifié ZFE',            'vehicule', 'Autorisé à circuler dans les Zones à Faibles Émissions', 'ShieldCheck', 18),
('vehicule:berline-premium','Berline Premium',         'vehicule', 'Véhicule haut de gamme (Mercedes, BMW, Audi…)', 'Star',        25),
('vehicule:grand-coffre',  'Grand Coffre',             'vehicule', 'Coffre > 500L, idéal foires et salons',     'Package',       8),
('vehicule:pmr',           'Accessible PMR',           'vehicule', 'Équipé pour accueillir des personnes à mobilité réduite', 'Accessibility', 10),
('vehicule:vitres-teintees','Vitres Teintées',         'vehicule', 'Discrétion et confort passager garanti',    'EyeOff',        6),

-- Chauffeur
('chauffeur:bilingue',     'Bilingue EN/FR',           'chauffeur', 'Maîtrise courante de l'anglais et du français', 'Languages',  15),
('chauffeur:vip',          'Transport VIP',             'chauffeur', 'Formation protocole et accueil haut de gamme',  'Crown',     22),
('chauffeur:nuit',         'Conduite de Nuit',          'chauffeur', 'Disponible de 22h à 6h, habilité nuit',        'Moon',      17),
('chauffeur:prive',        'Chauffeur Privé',           'chauffeur', 'Expérience en service exécutif discret',        'Briefcase', 20),
('chauffeur:adr',          'Habilitation ADR',          'chauffeur', 'Transport de matières dangereuses (certificat ADR)', 'AlertTriangle', 14),
('chauffeur:secouriste',   'Premiers Secours',          'chauffeur', 'Titulaire du PSC1 ou équivalent',               'HeartPulse',  5),

-- Espace publicitaire
('pub:grande-surface',     'Grande Surface',            'espace-pub', 'Surface adhésive > 3m², fort impact visuel', 'Maximize2',  20),
('pub:led-dynamique',      'Écran LED Dynamique',       'espace-pub', 'Écran LED rooftop ou latéral pour contenus animés', 'Monitor', 30),
('pub:eclairage-nuit',     'Éclairage Nocturne',        'espace-pub', 'Panneau lumineux visible de nuit (néon ou LED)',    'Lightbulb', 15);
