import { useRegion } from "@/lib/region-context";
import { type Region } from "@/lib/currency";

const REGIONAL_RULES: Record<Region, { title: string; items: string[]; law: string }> = {
  europe: {
    title: "Droit applicable — Europe",
    items: [
      "Conformité RGPD obligatoire (Règlement UE 2016/679).",
      "Le tracking GPS des véhicules constitue un traitement de données personnelles.",
      "Les données sont hébergées dans l'UE (Supabase — région EU).",
      "Contrats régis par le droit français — Tribunal de Paris compétent.",
    ],
    law: "Droit français / UE",
  },
  moyen_orient: {
    title: "Réglementation applicable — Moyen-Orient",
    items: [
      "UAE Personal Data Protection Law (PDPL 2023) applicable à Dubaï & Abu Dhabi.",
      "Permis municipal RTA requis pour toute publicité mobile à Dubaï.",
      "Interdiction de publicité pour l'alcool, les jeux d'argent et les contenus mixtes.",
      "Traduction arabe recommandée pour toute communication publicitaire.",
      "Contrats régis par le droit des Émirats Arabes Unis (DIFC Law pour Free Zones).",
    ],
    law: "Droit UAE / KSA",
  },
  afrique: {
    title: "Réglementation applicable — Afrique",
    items: [
      "Autorisation préfectorale / municipale requise pour la publicité mobile (variable par pays).",
      "Sénégal : loi n°2008-12 sur la protection des données personnelles (CDP).",
      "Côte d'Ivoire : loi n°2013-450 relative à la protection des données à caractère personnel.",
      "Contrats locaux recommandés — droit applicable selon le pays d'opération.",
    ],
    law: "Droit local (variable)",
  },
  asie: {
    title: "Réglementation applicable — Asie",
    items: [
      "Thaïlande : Personal Data Protection Act (PDPA) 2022.",
      "Vietnam : Decree 13/2023/ND-CP sur la protection des données personnelles.",
      "Inde : Digital Personal Data Protection Act (DPDPA) 2023.",
      "Permis locaux requis pour la publicité mobile selon la ville.",
    ],
    law: "Droit local (variable)",
  },
  amerique: {
    title: "Réglementation applicable — Amérique",
    items: [
      "États-Unis : pas de loi fédérale unique — se référer aux lois d'État (CCPA pour la Californie).",
      "Mexique : Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
      "Brésil : Lei Geral de Proteção de Dados (LGPD).",
      "Permis locaux requis pour la publicité mobile selon la municipalité.",
    ],
    law: "Droit local (variable)",
  },
};

export function RegionalLegalNotice() {
  const { region } = useRegion();
  const rules = REGIONAL_RULES[region];

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <h3 className="font-semibold text-sm">{rules.title}</h3>
        <span className="ml-auto text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
          {rules.law}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rules.items.map((item) => (
          <li key={item} className="text-xs text-muted-foreground flex gap-2">
            <span className="text-amber-500 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
        Ces informations sont indicatives. Consultez un juriste local avant toute opération
        commerciale.
      </p>
    </div>
  );
}
