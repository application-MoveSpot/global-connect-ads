import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Wallet } from "lucide-react";
import { CampaignPaymentCheckout } from "./CampaignPaymentCheckout";
import { CampaignTrialCheckout } from "./CampaignTrialCheckout";

type Mode = "onetime" | "subscription";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
  vehicleQuantity: number;
  onPaid?: () => void;
};

export function PaymentModeSelector({
  campaignRequestId,
  totalPriceEur,
  vehicleQuantity,
  onPaid,
}: Props) {
  const [mode, setMode] = useState<Mode>("onetime");

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">
        Comment souhaitez-vous régler cette campagne ?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModeCard
          selected={mode === "onetime"}
          onClick={() => setMode("onetime")}
          icon={<Wallet className="h-5 w-5" />}
          title="Paiement unique"
          description={`${totalPriceEur.toFixed(2)} € — portefeuille, carte ou virement`}
          badge="Campagne ponctuelle"
        />
        <ModeCard
          selected={mode === "subscription"}
          onClick={() => setMode("subscription")}
          icon={<RefreshCw className="h-5 w-5" />}
          title="Abonnement mensuel"
          description="14 jours d'essai gratuit — résiliable à tout moment"
          badge="Campagne récurrente"
        />
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-5">
        {mode === "onetime" && (
          <CampaignPaymentCheckout
            campaignRequestId={campaignRequestId}
            totalPriceEur={totalPriceEur}
            onPaid={onPaid}
          />
        )}
        {mode === "subscription" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              L'abonnement est facturé <strong>{vehicleQuantity} véhicule{vehicleQuantity > 1 ? "s" : ""}</strong> × tarif mensuel.
              Aucun prélèvement pendant 14 jours · annulable à tout moment pendant l'essai.
            </p>
            <CampaignTrialCheckout
              campaignRequestId={campaignRequestId}
              vehicleQuantity={vehicleQuantity}
              buttonLabel="Activer l'essai gratuit de 14 jours"
            />
          </div>
        )}
      </div>
    </div>
  );
}

type ModeCardProps = {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
};

function ModeCard({ selected, onClick, icon, title, description, badge }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative w-full rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]",
      ].join(" ")}
    >
      {badge && (
        <span className="absolute top-3 right-3 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className={selected ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      <span
        className={[
          "mt-3 block h-1.5 w-1.5 rounded-full transition-colors",
          selected ? "bg-primary" : "bg-border",
        ].join(" ")}
      />
    </button>
  );
}
