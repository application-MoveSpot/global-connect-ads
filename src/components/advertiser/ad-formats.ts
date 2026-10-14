export type VehicleKey =
  | "van"
  | "food_truck"
  | "voiture"
  | "taxi"
  | "scooter"
  | "velo_cargo"
  | "triporteur"
  | "camion_led"
  | "sac_a_dos_lcd"
  | "sac_a_dos_affiche"
  | "autre";

export const CAMION_LED_SPEC = {
  id: "vtype_boxled_generic",
  name: "Camion Écran LED — Format Urbain",
  category: "Affichage Mobile",
  vehicleClass: "Utilitaire Châssis-Cabine 3.5 t (Permis B)",
  dimensions: { lengthMm: 5930, widthMm: 2350, heightMm: 3150 },
  screens: {
    type: "LED Extérieur Haute Luminosité (IP67)",
    activeFaces: ["gauche", "droite", "arrière"] as const,
    formats: ["Vidéo MP4", "Image JPEG/PNG", "Flux Dynamique HTML5"],
    resolution: { side: "3200×1920 px", rear: "1920×1920 px" },
  },
  tags: ["Urbain", "Événementiel", "Centre-ville", "Forte visibilité", "Campagne Vidéo"],
} as const;

export type AdFormat = "covering_total" | "demi_covering" | "stickers" | "affiche" | "boxled";

export const AD_FORMATS: { v: AdFormat; l: string; desc: string }[] = [
  { v: "covering_total", l: "Covering total", desc: "Habillage complet du véhicule" },
  { v: "demi_covering", l: "Demi-covering", desc: "Moitié inférieure" },
  { v: "stickers", l: "Stickers", desc: "Autocollants ciblés" },
  { v: "affiche", l: "Affiche", desc: "Panneau fixe" },
  { v: "boxled", l: "Écran LED/Vidéo", desc: "Fourgon publicitaire numérique (3 faces LED)" },
];

export const BOXLED_INCOMPATIBLE: VehicleKey[] = [
  "food_truck",
  "scooter",
  "velo_cargo",
  "triporteur",
];

export function isFormatIncompatible(vehicleTypes: string[], format: AdFormat): boolean {
  if (format !== "boxled") return false;
  return vehicleTypes.some((t) => BOXLED_INCOMPATIBLE.includes(t as VehicleKey));
}

export const VEHICLE_FORMATS: Partial<Record<VehicleKey, AdFormat[]>> = {
  camion_led: ["boxled"],
  sac_a_dos_lcd: ["boxled"],
  food_truck: ["covering_total", "demi_covering", "stickers", "affiche"],
  scooter: ["stickers", "affiche"],
  velo_cargo: ["stickers", "affiche"],
  triporteur: ["stickers", "affiche"],
};

export const SCREEN_VEHICLE_TYPES: VehicleKey[] = ["camion_led", "sac_a_dos_lcd"];
