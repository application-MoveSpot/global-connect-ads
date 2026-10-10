import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
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

type Props = {
  returnUrl?: string;
  campaignBriefId?: string | null;
  accountType?: string | null;
};

export function CampaignPackCheckout({ returnUrl, campaignBriefId, accountType }: Props) {
  const { t } = useTranslation();
  const { fmtAmount } = useCurrency();
  const isIndividual = accountType === "individual";

  const BUSINESS_PACKS: Pack[] = [
    { id: "starter", label: t("campaign_pack.pack_starter_label"), days: 7, price: 49, perDay: 7, desc: t("campaign_pack.pack_starter_desc") },
    { id: "standard", label: t("campaign_pack.pack_standard_label"), days: 14, price: 79, perDay: 5.6, badge: t("campaign_pack.pack_standard_badge"), desc: t("campaign_pack.pack_standard_desc") },
    { id: "boost", label: t("campaign_pack.pack_boost_label"), days: 30, price: 149, perDay: 5, desc: t("campaign_pack.pack_boost_desc") },
  ];

  const INDIVIDUAL_PACKS: Pack[] = [
    { id: "weekend", icon: "🎪", label: t("campaign_pack.pack_weekend_label"), sublabel: t("campaign_pack.pack_weekend_sublabel"), days: 3, price: 49, perDay: 16.3, desc: t("campaign_pack.pack_weekend_desc") },
    { id: "evenement", icon: "🎪", label: t("campaign_pack.pack_evenement_label"), sublabel: t("campaign_pack.pack_evenement_sublabel"), days: 7, price: 79, perDay: 11.3, badge: t("campaign_pack.pack_evenement_badge"), desc: t("campaign_pack.pack_evenement_desc") },
    { id: "lancement", icon: "🏪", label: t("campaign_pack.pack_lancement_label"), sublabel: t("campaign_pack.pack_lancement_sublabel"), days: 14, price: 149, perDay: 10.6, desc: t("campaign_pack.pack_lancement_desc") },
  ];

  const packs = isIndividual ? INDIVIDUAL_PACKS : BUSINESS_PACKS;
  const [selected, setSelected] = useState<Pack>(() => packs[1]);

  return (
    <div className="space-y-4">
      {isIndividual && (
        <p className="text-xs text-muted-foreground">
          {t("campaign_pack.individual_notice")}
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
            <p className="font-display text-2xl font-bold">{fmtAmount(pack.price)}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {t("campaign_pack.days_rate", { count: pack.days, s: pack.days > 1 ? "s" : "", rate: pack.perDay.toFixed(0) })}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{pack.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-0.5">
        <p>{t("campaign_pack.guarantee_1")}</p>
        <p>{t("campaign_pack.guarantee_2")}</p>
        <p>{t("campaign_pack.guarantee_3")}</p>
      </div>

      <WalletTopupCheckout
        amountEuros={selected.price}
        returnUrl={returnUrl ?? (typeof window !== "undefined" ? window.location.href : "/")}
        campaignBriefId={campaignBriefId}
        buttonLabel={t("campaign_pack.btn_pay", { price: selected.price, icon: selected.icon ?? "", label: selected.label, count: selected.days, s: selected.days > 1 ? "s" : "" })}
        className="w-full"
      />
    </div>
  );
}
