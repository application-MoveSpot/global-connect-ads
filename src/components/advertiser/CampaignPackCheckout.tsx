import { useState } from "react";
import { WalletTopupCheckout } from "./WalletTopupCheckout";

type Pack = {
  id: string;
  label: string;
  days: number;
  price: number;
  perDay: number;
  badge?: string;
  desc: string;
};

const PACKS: Pack[] = [
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

type Props = {
  returnUrl?: string;
  campaignBriefId?: string | null;
};

export function CampaignPackCheckout({ returnUrl, campaignBriefId }: Props) {
  const [selected, setSelected] = useState<Pack>(PACKS[1]);
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => { setSelected(pack); setShowCheckout(false); }}
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
            <p className="font-semibold text-sm mb-1">{pack.label}</p>
            <p className="font-display text-2xl font-bold">{pack.price} €</p>
            <p className="text-xs text-muted-foreground mb-2">{pack.days} jours · ~{pack.perDay.toFixed(0)} €/j</p>
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
        buttonLabel={`Payer ${selected.price} € — Pack ${selected.label} (${selected.days} jours)`}
        className="w-full"
      />
    </div>
  );
}
