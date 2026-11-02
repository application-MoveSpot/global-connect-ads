// ─── Skills type system ───────────────────────────────────────────────────────
//
// Template literal types pour que le compilateur rejette un slug invalide
// avant que l'appli tourne. Zéro erreur au runtime grâce au typage exhaustif.
//
// Pattern inspiré de Matt Pocock : on ne laisse pas les enums simples
// nous mentir — on force l'inférence stricte à la source.

// Les slugs sont la source de vérité. Toute la logique dérive d'ici.
const VEHICLE_SKILL_SLUGS = [
  "vehicule:electrique",
  "vehicule:zfe-certifie",
  "vehicule:berline-premium",
  "vehicule:grand-coffre",
  "vehicule:pmr",
  "vehicule:vitres-teintees",
] as const;

const DRIVER_SKILL_SLUGS = [
  "chauffeur:bilingue",
  "chauffeur:vip",
  "chauffeur:nuit",
  "chauffeur:prive",
  "chauffeur:adr",
  "chauffeur:secouriste",
] as const;

const PUB_SKILL_SLUGS = ["pub:grande-surface", "pub:led-dynamique", "pub:eclairage-nuit"] as const;

export const ALL_SKILL_SLUGS = [
  ...VEHICLE_SKILL_SLUGS,
  ...DRIVER_SKILL_SLUGS,
  ...PUB_SKILL_SLUGS,
] as const;

// Types inférés — pas de duplication possible
export type VehicleSkillSlug = (typeof VEHICLE_SKILL_SLUGS)[number];
export type DriverSkillSlug = (typeof DRIVER_SKILL_SLUGS)[number];
export type PubSkillSlug = (typeof PUB_SKILL_SLUGS)[number];
export type SkillSlug = (typeof ALL_SKILL_SLUGS)[number];
export type SkillCategory = "vehicule" | "chauffeur" | "espace-pub";

// ─── Modèle de données ────────────────────────────────────────────────────────

export type Skill = {
  id: string;
  slug: SkillSlug;
  label: string;
  category: SkillCategory;
  description: string | null;
  icon: string | null;
  // C'est le chiffre que l'UI affiche côté PMM — ex: +15
  revenue_boost_pct: number;
  created_at: string;
};

export type VehicleSkillRow = {
  vehicle_id: string;
  skill_id: string;
  verified_at: string | null;
  skill: Skill;
};

export type DriverSkillRow = {
  driver_id: string;
  skill_id: string;
  verified_at: string | null;
  skill: Skill;
};

// ─── Matching compile-time ────────────────────────────────────────────────────
//
// Le compilateur T'empêche d'assigner une mission qui requiert VIP
// à un chauffeur sans ce skill. Pas au runtime. Maintenant. Ici.

// Une mission déclare ses exigences de manière stricte
export type MissionRequirements = {
  driverSkills?: DriverSkillSlug[];
  vehicleSkills?: VehicleSkillSlug[];
};

// "Est-ce que ce chauffeur a TOUS les skills requis ?"
// Si T n'est pas un sous-ensemble de U, le compilateur crie.
type IsSubset<T extends readonly string[], U extends string> = T[number] extends U ? true : false;

// Profil chauffeur avec ses skills (version type-safe)
export type TypedDriverProfile = {
  id: string;
  skills: readonly DriverSkillSlug[];
};

export type TypedVehicle = {
  id: string;
  skills: readonly VehicleSkillSlug[];
};

// Vérification compile-time : TS error si le driver n'a pas les skills
// Exemple d'usage :
//   const ok: CanFulfill<["chauffeur:vip"], typeof driver.skills>  ← boolean
export type CanFulfill<
  TRequired extends DriverSkillSlug[],
  TDriverSkills extends readonly DriverSkillSlug[],
> = IsSubset<TRequired, TDriverSkills[number]>;

// ─── Matching runtime (la version "homme des cavernes" qui marche vraiment) ───
//
// Pas de magie. Juste du filtre. Chauffeur sans skill → rejeté.
export function driverHasSkills(driverSkills: string[], required: DriverSkillSlug[]): boolean {
  return required.every((s) => driverSkills.includes(s));
}

export function vehicleHasSkills(vehicleSkills: string[], required: VehicleSkillSlug[]): boolean {
  return required.every((s) => vehicleSkills.includes(s));
}

// Filtre une flotte par exigences : renvoie seulement ceux qui matchent tout
export function filterFleet<T extends { skills: string[] }>(
  fleet: T[],
  requirements: MissionRequirements,
): T[] {
  return fleet.filter((member) => {
    const driverOk = requirements.driverSkills
      ? driverHasSkills(member.skills, requirements.driverSkills)
      : true;
    const vehicleOk = requirements.vehicleSkills
      ? vehicleHasSkills(member.skills, requirements.vehicleSkills)
      : true;
    return driverOk && vehicleOk;
  });
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export function isValidSkillSlug(slug: string): slug is SkillSlug {
  return (ALL_SKILL_SLUGS as readonly string[]).includes(slug);
}

export function getSkillCategory(slug: SkillSlug): SkillCategory {
  if (slug.startsWith("vehicule:")) return "vehicule";
  if (slug.startsWith("chauffeur:")) return "chauffeur";
  return "espace-pub";
}
