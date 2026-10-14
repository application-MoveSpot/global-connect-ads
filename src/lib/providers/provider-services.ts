export type ProviderServiceKey = "covering_vehicule" | "video_publicitaire" | "creation_graphique";

export const PROVIDER_SERVICES: { key: ProviderServiceKey; label: string; description: string }[] =
  [
    {
      key: "covering_vehicule",
      label: "Covering / flocage véhicule",
      description: "Impression et pose d'adhésifs publicitaires sur véhicules.",
    },
    {
      key: "video_publicitaire",
      label: "Production vidéo publicitaire",
      description: "Création de spots et vidéos publicitaires (tournage, montage).",
    },
    {
      key: "creation_graphique",
      label: "Création graphique",
      description: "Conception des visuels publicitaires pour les annonceurs.",
    },
  ];

export const PROVIDER_SERVICE_LABEL: Record<string, string> = Object.fromEntries(
  PROVIDER_SERVICES.map((s) => [s.key, s.label]),
);

export function providerServiceLabel(key: string): string {
  return PROVIDER_SERVICE_LABEL[key] ?? key;
}
