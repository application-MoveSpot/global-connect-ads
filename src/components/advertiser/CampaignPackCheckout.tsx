import { useState } from "react";
import { WalletTopupCheckout } from "./WalletTopupCheckout";

type Pack = {
  id: string;
  icon?: string;
  label: string;
  sublabel?: string;
  days: number;
  price: number;
  perDay: number;
  badge?: string;
  desc: string;
};

const BUSINESS_PACKS: Pack[] = [
  {
    id: "starter",
    label: "Starter",
    days: 7,
    price: 49,
    perDay: 7,
    desc: "1 véhicule · zone unique · idéal pour tester",
  },
  {
    id: "standard",
    label: "Standard",
    days: 14,
    price: 79,
    perDay: 5.6,
    badge: "Populaire",
    desc: "1 véhicule · 2 semaines de visibilité",
  },
  {
    id: "boost",
    label: "Boost",
    days: 30,
    price: 149,
    perDay: 5,
    desc: "1 véhicule · 1 mois · meilleur rapport visibilité/prix",
  },
];

const INDIVIDUAL_PACKS: Pack[] = [
  {
    id: "weekend",
    icon: "🎪",
    label: "Week-end",
    sublabel: "Festival · Marché · Brocante",
    days: 3,
    price: 49,
    perDay: 16.3,
    desc: "3 jours de visibilité intense — idéal pour un événement court",
  },
  {
    id: "evenement",
    icon: "🎪",
    label: "Événement",
    sublabel: "Vernissage · Inauguration · Kermesse",
    days: 7,
    price: 79,
    perDay: 11.3,
    badge: "Le plus choisi",
    desc: "1 semaine de campagne autour du lieu de l'événement",
  },
  {
    id: "lancement",
    icon: "🏪",
    label: "Lancement",
    sublabel: "Commerce · Association · Projet local",
    days: 14,
    price: 149,
    perDay: 10.6,
    desc: "2 semaines pour installer votre présence dans le quartier",
  },
];

type Props = {
  returnUrl?: string;
  campaignBriefId?: string | null;
  accountType?: string | null;
};

export function CampaignPackCheckout({ returnUrl, campaignBriefId, accountType }: Props) {
  const isIndividual = accountType === "individual";
  const packs = isIndividual ? INDIVIDUAL_PACKS : BUSINESS_PACKS;
  const [selected, setSelected] = useState<Pack>(packs[1]);

  return (
    <div className="space-y-4">
      {isIndividual && (
        <p className="text-xs text-muted-foreground">
          Le montant est crédité sur votre portefeuille — utilisez-le pour payer votre campagne une fois qu'un propriétaire accepte votre brief.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {packs.map((pack) => (
          <button
            key={pack.id}
            onClick={() => setSelected(pack)}
            className={`relative rounded-2xl border-2 p-4 text-left transition ${
              selected.id === pack.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {pack.badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground whitespace-nowrap">
                {pack.badge}
              </span>
            )}
            {pack.icon && (
              <span className="text-2xl mb-2 block">{pack.icon}</span>
            )}
            <p className="font-semibold text-sm mb-0.5">{pack.label}</p>
            {pack.sublabel && (
              <p className="text-[10px] text-muted-foreground mb-1.5">{pack.sublabel}</p>
            )}
            <p className="font-display text-2xl font-bold">{pack.price} €</p>
            <p className="text-xs text-muted-foreground mb-2">
              {pack.days} jour{pack.days > 1 ? "s" : ""} · ~{pack.perDay.toFixed(0)} €/j
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{pack.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-0.5">
        <p>✓ Paiement unique — aucun abonnement, aucun renouvellement automatique</p>
        <p>✓ Le montant est crédité sur votre portefeuille MoveSpot immédiatement</p>
        <p>✓ Utilisez-le pour financer votre campagne en quelques clics</p>
      </div>

      <WalletTopupCheckout
        amountEuros={selected.price}
        returnUrl={returnUrl ?? (typeof window !== "undefined" ? window.location.href : "/")}
        campaignBriefId={campaignBriefId}
        buttonLabel={`Payer ${selected.price} € — ${selected.icon ?? ""} ${selected.label} (${selected.days} jour${selected.days > 1 ? "s" : ""})`}
        className="w-full"
      />
    </div>
  );
}
