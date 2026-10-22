import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { Check, X, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_public/tarifs")({
  head: () => ({
    meta: [
      { title: "Pricing — MoveSpot | Tarifs MoveSpot" },
      {
        name: "description",
        content:
          "MoveSpot pricing: free for vehicle owners, transparent commission for advertisers, monthly plans for installers. No hidden fees. / Grille tarifaire MoveSpot : gratuit pour les propriétaires, commission transparente pour les advertisers.",
      },
      { property: "og:title", content: "MoveSpot Pricing — Transparent on price" },
      {
        property: "og:description",
        content:
          "No hidden subscription. Vehicle owners: free. Advertisers: pay per campaign. Installers: flexible plans.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/tarifs" },
      ...hreflangLinks("/tarifs"),
    ],
  }),
  component: Tarifs,
});

type FeatureRow = {
  label: string;
  particulier: boolean | string | null;
  pme: boolean | string | null;
  enterprise: boolean | string | null;
};
type OwnerRow = {
  label: string;
  particulier: boolean | string | null;
  pro: boolean | string | null;
};

const CONTENT = {
  fr: {
    h1: "Transparent sur les prix",
    desc: "Pas d'abonnement caché, pas de frais d'activation. Vous payez uniquement quand une campagne se réalise.",
    // Advertiser section
    adv_eyebrow: "Annonceurs",
    adv_h2: "Vous faites la pub — vous choisissez votre budget",
    adv_sub:
      "Particulier, association, TPE ou grand compte : même plateforme, conditions adaptées.",
    adv_comparison: "Voir la comparaison complète",
    // Advertiser cards
    card1_badge: "Particulier · Asso",
    card1_price_sub: "d'inscription",
    card1_commission: "+ 30 % de commission par campagne",
    card1_features: [
      "Campagnes dès 25 €/jour par véhicule",
      "Briefs illimités",
      "Suivi GPS temps réel",
      "Paiement CB sécurisé",
    ],
    card1_cta: "Créer un compte",
    card2_badge: "PME · Startup · Indépendant",
    card2_popular: "Le plus populaire",
    card2_price_sub: "d'inscription",
    card2_commission: "+ 25 % de commission par campagne",
    card2_features: [
      "Campagnes dès 25 €/jour par véhicule",
      "Briefs illimités",
      "Suivi GPS + rapport PDF",
      "Virement + portefeuille prépayé",
      "Factures TVA automatiques",
    ],
    card2_cta: "Commencer gratuitement",
    card3_badge: "Grande entreprise · Réseau",
    card3_price: "Sur devis",
    card3_commission: "Commission négociée, budget annuel",
    card3_features: [
      "Tout ce qui est dans PME",
      "Account manager dédié",
      "Contrat-cadre annuel",
      "Onboarding personnalisé",
    ],
    card3_cta: "Demander un devis",
    // Feature table headers
    feat_col_feature: "Fonctionnalité",
    feat_col_individual: "Particulier",
    feat_col_sme: "PME",
    feat_col_enterprise: "Grand compte",
    // Owner section
    own_eyebrow: "Propriétaires de véhicules",
    own_h2: "Vous avez un véhicule — c'est gratuit",
    own_sub:
      "Particulier avec une voiture ou gestionnaire d'une flotte de cent véhicules : inscription 0 €, vous touchez 70 % de chaque campagne.",
    own_comparison: "Voir la comparaison complète",
    own_card1_badge: "Particulier · 1 à 3 véhicules",
    own_card1_price: "Gratuit",
    own_card1_price_sub: "à vie",
    own_card1_commission: "MoveSpot retient 30 % de commission par campagne encaissée",
    own_card1_features: [
      "Inscription et modération incluses",
      "Paiement automatique par campagne",
      "QR d'installation inclus",
      "Tableau de bord simple",
    ],
    own_card1_cta: "Inscrire mon véhicule",
    own_card2_badge: "Pro · Flotte illimitée",
    own_card2_price: "Gratuit",
    own_card2_price_sub: "à vie",
    own_card2_commission: "30 % par campagne (négociable à partir de 20 véhicules)",
    own_card2_features: [
      "Tout ce qui est dans Particulier",
      "Carte flotte multi-véhicules",
      "Import CSV + gestion multi-drivers",
      "Indicateurs CA, km, taux d'occupation",
    ],
    own_card2_cta: "Inscrire ma flotte",
    own_col_feature: "Fonctionnalité",
    own_col_individual: "Particulier",
    own_col_pro: "Pro / Flotte",
    // Provider section
    prov_eyebrow: "Prestataires poseurs",
    prov_h2: "Vous posez les habillages — abonnement mensuel",
    prov_sub:
      "Accédez aux demandes de pose géolocalisées autour de votre secteur. Résiliable à tout moment.",
    prov_trial: "14 jours d'essai gratuit",
    prov_plans: [
      {
        name: "Starter",
        price: "29 €",
        unit: "/mois",
        features: ["5 demandes/mois", "Profil vérifié", "Messagerie intégrée"],
        cta: "Essayer gratuitement",
        href: "/provider/inscription",
        highlight: false,
      },
      {
        name: "Standard",
        price: "42 €",
        unit: "/mois",
        features: [
          "20 demandes/mois",
          "Profil vérifié + portfolio",
          "Messagerie + devis intégrés",
          "Badge partner certifié",
        ],
        cta: "Essayer gratuitement",
        href: "/provider/inscription",
        highlight: true,
      },
      {
        name: "Pro",
        price: "59 €",
        unit: "/mois",
        features: [
          "Demandes illimitées",
          "Tout dans Standard",
          "Mise en avant dans les résultats",
          "Accès prioritaire aux grands comptes",
        ],
        cta: "Essayer gratuitement",
        href: "/provider/inscription",
        highlight: false,
      },
    ],
    prov_recommended: "★ Recommandé",
    // FAQ
    faq_h2: "Questions fréquentes",
    faq: [
      {
        q: "La commission est-elle prélevée sur le montant TTC ou HT ?",
        a: "Sur le montant HT de la campagne. La TVA est collectée et reversée indépendamment.",
      },
      {
        q: "Quand suis-je payé en tant que propriétaire ?",
        a: "Après validation de la campagne (fin de mission + confirmation du propriétaire). Le virement est émis sous 5 jours ouvrés via Stripe Connect.",
      },
      {
        q: "Puis-je lancer une campagne sans créer de compte ?",
        a: "Non. Un compte est requis pour créer un brief, suivre la campagne en temps réel et accéder à vos factures.",
      },
      {
        q: "La commission de 25 % pour PME est-elle automatique ?",
        a: "Oui, dès qu'un SIRET valide est associé à votre compte, le taux passe à 25 % automatiquement.",
      },
      {
        q: "Les providers peuvent-ils résilier à tout moment ?",
        a: "Oui, sans frais ni préavis. L'abonnement se poursuit jusqu'à la fin de la période en cours.",
      },
    ],
    // CTA
    cta_h2: "Prêt à démarrer ?",
    cta_desc: "Inscription gratuite, première campagne en moins de 10 minutes.",
    cta_advertiser: "Je lance une campagne",
    cta_owner: "J'inscris mon véhicule",
    // Feature rows
    adv_features: [
      { label: "Inscription", particulier: "Gratuit", pme: "Gratuit", enterprise: "Gratuit" },
      { label: "Commission MoveSpot", particulier: "30 %", pme: "25 %", enterprise: "Sur devis" },
      {
        label: "Campagne à partir de",
        particulier: "25 €/jour",
        pme: "25 €/jour",
        enterprise: "500 €",
      },
      { label: "Briefs illimités", particulier: true, pme: true, enterprise: true },
      { label: "Suivi GPS temps réel", particulier: true, pme: true, enterprise: true },
      { label: "Rapport PDF exportable", particulier: false, pme: true, enterprise: true },
      { label: "Paiement par virement", particulier: false, pme: true, enterprise: true },
      { label: "Portefeuille prépayé", particulier: false, pme: true, enterprise: true },
      { label: "Factures TVA automatiques", particulier: false, pme: true, enterprise: true },
      { label: "Account manager dédié", particulier: false, pme: false, enterprise: true },
      { label: "Contrat-cadre annuel", particulier: false, pme: false, enterprise: true },
    ] as FeatureRow[],
    own_features: [
      { label: "Inscription", particulier: "Gratuit", pro: "Gratuit" },
      { label: "Nombre de véhicules", particulier: "1 à 3", pro: "Illimité" },
      { label: "Part reversée", particulier: "70 %", pro: "70 % (négociable)" },
      { label: "Paiement par campagne", particulier: true, pro: true },
      { label: "QR d'installation inclus", particulier: true, pro: true },
      { label: "Tableau de bord basique", particulier: true, pro: true },
      { label: "Carte flotte multi-véhicules", particulier: false, pro: true },
      { label: "Import CSV de la flotte", particulier: false, pro: true },
      { label: "Indicateurs CA / km", particulier: false, pro: true },
      { label: "Gestion multi-drivers", particulier: false, pro: true },
    ] as OwnerRow[],
  },
  en: {
    h1: "Transparent pricing",
    desc: "No hidden subscription, no activation fee. You pay only when a campaign runs.",
    adv_eyebrow: "Advertisers",
    adv_h2: "You run the ad — you choose the budget",
    adv_sub: "Individual, association, SME or enterprise: same platform, tailored conditions.",
    adv_comparison: "See full comparison",
    card1_badge: "Individual · Non-profit",
    card1_price_sub: "sign-up",
    card1_commission: "+ 30% commission per campaign",
    card1_features: [
      "Campaigns from €25/day per vehicle",
      "Unlimited briefs",
      "Real-time GPS tracking",
      "Secure card payment",
    ],
    card1_cta: "Create an account",
    card2_badge: "SME · Startup · Freelancer",
    card2_popular: "Most popular",
    card2_price_sub: "sign-up",
    card2_commission: "+ 25% commission per campaign",
    card2_features: [
      "Campaigns from €25/day per vehicle",
      "Unlimited briefs",
      "GPS tracking + PDF report",
      "Bank transfer + prepaid wallet",
      "Automatic VAT invoices",
    ],
    card2_cta: "Start for free",
    card3_badge: "Enterprise · Network",
    card3_price: "Custom quote",
    card3_commission: "Negotiated commission, annual budget",
    card3_features: [
      "Everything in SME",
      "Dedicated account manager",
      "Annual framework contract",
      "Personalised onboarding",
    ],
    card3_cta: "Request a quote",
    feat_col_feature: "Feature",
    feat_col_individual: "Individual",
    feat_col_sme: "SME",
    feat_col_enterprise: "Enterprise",
    own_eyebrow: "Vehicle Owners",
    own_h2: "You have a vehicle — it's free",
    own_sub: "One car or a hundred-vehicle fleet: sign up for €0 and keep 70% of every campaign.",
    own_comparison: "See full comparison",
    own_card1_badge: "Individual · 1 to 3 vehicles",
    own_card1_price: "Free",
    own_card1_price_sub: "forever",
    own_card1_commission: "You pay MoveSpot 30% per campaign collected",
    own_card1_features: [
      "Registration & moderation included",
      "Automatic payment per campaign",
      "Installation QR included",
      "Simple dashboard",
    ],
    own_card1_cta: "Register my vehicle",
    own_card2_badge: "Pro · Unlimited fleet",
    own_card2_price: "Free",
    own_card2_price_sub: "forever",
    own_card2_commission: "30% per campaign (negotiable from 20 vehicles)",
    own_card2_features: [
      "Everything in Individual",
      "Multi-vehicle fleet map",
      "CSV import + multi-driver management",
      "Revenue, km, occupancy indicators",
    ],
    own_card2_cta: "Register my fleet",
    own_col_feature: "Feature",
    own_col_individual: "Individual",
    own_col_pro: "Pro / Fleet",
    prov_eyebrow: "Installers",
    prov_h2: "You install wraps — monthly subscription",
    prov_sub: "Access geolocated installation requests around your area. Cancel any time.",
    prov_trial: "14-day free trial",
    prov_plans: [
      {
        name: "Starter",
        price: "€29",
        unit: "/month",
        features: ["5 requests/month", "Verified profile", "Integrated messaging"],
        cta: "Try for free",
        href: "/provider/inscription",
        highlight: false,
      },
      {
        name: "Standard",
        price: "€42",
        unit: "/month",
        features: [
          "20 requests/month",
          "Verified profile + portfolio",
          "Messaging + integrated quotes",
          "Certified partner badge",
        ],
        cta: "Try for free",
        href: "/provider/inscription",
        highlight: true,
      },
      {
        name: "Pro",
        price: "€59",
        unit: "/month",
        features: [
          "Unlimited requests",
          "Everything in Standard",
          "Featured in results",
          "Priority access to enterprise accounts",
        ],
        cta: "Try for free",
        href: "/provider/inscription",
        highlight: false,
      },
    ],
    prov_recommended: "★ Recommended",
    faq_h2: "Frequently asked questions",
    faq: [
      {
        q: "Is the commission taken on the VAT-inclusive or VAT-exclusive amount?",
        a: "On the VAT-exclusive (net) campaign amount. VAT is collected and remitted separately.",
      },
      {
        q: "When do I get paid as an owner?",
        a: "After campaign validation (end of mission + owner confirmation). Payment is sent within 5 business days via Stripe Connect.",
      },
      {
        q: "Can I launch a campaign without creating an account?",
        a: "No. An account is required to create a brief, track the campaign in real time and access your invoices.",
      },
      {
        q: "Is the 25% SME commission applied automatically?",
        a: "Yes, as soon as a valid company registration number is linked to your account, the rate drops to 25% automatically.",
      },
      {
        q: "Can installers cancel at any time?",
        a: "Yes, with no fee or notice period. The subscription continues until the end of the current billing period.",
      },
    ],
    cta_h2: "Ready to get started?",
    cta_desc: "Free sign-up, first campaign live in under 10 minutes.",
    cta_advertiser: "Launch a campaign",
    cta_owner: "Register my vehicle",
    adv_features: [
      { label: "Sign-up", particulier: "Free", pme: "Free", enterprise: "Free" },
      { label: "MoveSpot commission", particulier: "30%", pme: "25%", enterprise: "Custom" },
      { label: "Campaign from", particulier: "€25/day", pme: "€25/day", enterprise: "€500" },
      { label: "Unlimited briefs", particulier: true, pme: true, enterprise: true },
      { label: "Real-time GPS tracking", particulier: true, pme: true, enterprise: true },
      { label: "Exportable PDF report", particulier: false, pme: true, enterprise: true },
      { label: "Bank transfer payment", particulier: false, pme: true, enterprise: true },
      { label: "Prepaid wallet", particulier: false, pme: true, enterprise: true },
      { label: "Automatic VAT invoices", particulier: false, pme: true, enterprise: true },
      { label: "Dedicated account manager", particulier: false, pme: false, enterprise: true },
      { label: "Annual framework contract", particulier: false, pme: false, enterprise: true },
    ] as FeatureRow[],
    own_features: [
      { label: "Sign-up", particulier: "Free", pro: "Free" },
      { label: "Number of vehicles", particulier: "1 to 3", pro: "Unlimited" },
      { label: "Revenue share", particulier: "70%", pro: "70% (negotiable)" },
      { label: "Payment per campaign", particulier: true, pro: true },
      { label: "Installation QR included", particulier: true, pro: true },
      { label: "Basic dashboard", particulier: true, pro: true },
      { label: "Multi-vehicle fleet map", particulier: false, pro: true },
      { label: "Fleet CSV import", particulier: false, pro: true },
      { label: "Revenue / km indicators", particulier: false, pro: true },
      { label: "Multi-driver management", particulier: false, pro: true },
    ] as OwnerRow[],
  },
};

function Cell({ value }: { value: boolean | string | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-signal mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

function Tarifs() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? CONTENT.en : CONTENT.fr;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{c.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{c.desc}</p>
        </div>

        {/* ── Annonceurs / Advertisers ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">
              {c.adv_eyebrow}
            </span>
            <h2 className="font-display text-3xl font-bold mt-1">{c.adv_h2}</h2>
            <p className="text-muted-foreground mt-2">{c.adv_sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {/* Individual */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {c.card1_badge}
                </span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">0 €</div>
              <div className="text-sm text-muted-foreground mb-1">{c.card1_price_sub}</div>
              <div className="text-sm font-medium mb-6">{c.card1_commission}</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                {c.card1_features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/advertiser/inscription"
                className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition"
              >
                {c.card1_cta}
              </Link>
            </div>

            {/* SME — highlighted */}
            <div className="rounded-2xl border-2 border-primary bg-card p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full">
                {c.card2_popular}
              </div>
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {c.card2_badge}
                </span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">0 €</div>
              <div className="text-sm text-muted-foreground mb-1">{c.card2_price_sub}</div>
              <div className="text-sm font-medium mb-6">{c.card2_commission}</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                {c.card2_features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/advertiser/inscription"
                className="rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold text-center hover:bg-primary/90 transition shadow-glow"
              >
                {c.card2_cta}
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {c.card3_badge}
                </span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">{c.card3_price}</div>
              <div className="text-sm text-muted-foreground mb-1">&nbsp;</div>
              <div className="text-sm font-medium mb-6">{c.card3_commission}</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                {c.card3_features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                search={{ plan: "enterprise" }}
                className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition"
              >
                {c.card3_cta}
              </Link>
            </div>
          </div>

          <details className="rounded-xl border border-border overflow-hidden">
            <summary className="px-6 py-4 cursor-pointer text-sm font-medium hover:bg-secondary/30 transition select-none flex items-center justify-between">
              <span>{c.adv_comparison}</span>
              <span className="text-muted-foreground text-xs">▼</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-secondary/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground w-1/2">
                      {c.feat_col_feature}
                    </th>
                    <th className="text-center px-4 py-3 font-medium">{c.feat_col_individual}</th>
                    <th className="text-center px-4 py-3 font-medium text-primary">
                      {c.feat_col_sme}
                    </th>
                    <th className="text-center px-4 py-3 font-medium">{c.feat_col_enterprise}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.adv_features.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                    >
                      <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.particulier} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.pme} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* ── Propriétaires / Owners ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-signal">
              {c.own_eyebrow}
            </span>
            <h2 className="font-display text-3xl font-bold mt-1">{c.own_h2}</h2>
            <p className="text-muted-foreground mt-2">{c.own_sub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-10 max-w-3xl">
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {c.own_card1_badge}
                </span>
              </div>
              <div className="font-display text-4xl font-bold text-signal mb-1">
                {c.own_card1_price}
              </div>
              <div className="text-sm text-muted-foreground mb-1">{c.own_card1_price_sub}</div>
              <div className="text-sm font-medium mb-6">{c.own_card1_commission}</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                {c.own_card1_features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/owner/inscription"
                className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition"
              >
                {c.own_card1_cta}
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-signal/40 bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-signal/10 text-signal">
                  {c.own_card2_badge}
                </span>
              </div>
              <div className="font-display text-4xl font-bold text-signal mb-1">
                {c.own_card2_price}
              </div>
              <div className="text-sm text-muted-foreground mb-1">{c.own_card2_price_sub}</div>
              <div className="text-sm font-medium mb-6">{c.own_card2_commission}</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                {c.own_card2_features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/owner/inscription"
                className="rounded-lg bg-signal text-white py-2.5 text-sm font-semibold text-center hover:bg-signal/90 transition"
              >
                {c.own_card2_cta}
              </Link>
            </div>
          </div>

          <details className="rounded-xl border border-border overflow-hidden max-w-3xl">
            <summary className="px-6 py-4 cursor-pointer text-sm font-medium hover:bg-secondary/30 transition select-none flex items-center justify-between">
              <span>{c.own_comparison}</span>
              <span className="text-muted-foreground text-xs">▼</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-secondary/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground w-1/2">
                      {c.own_col_feature}
                    </th>
                    <th className="text-center px-4 py-3 font-medium">{c.own_col_individual}</th>
                    <th className="text-center px-4 py-3 font-medium text-signal">
                      {c.own_col_pro}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.own_features.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                    >
                      <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.particulier} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.pro} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* ── Prestataires / Installers ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              {c.prov_eyebrow}
            </span>
            <h2 className="font-display text-3xl font-bold mt-1">{c.prov_h2}</h2>
            <p className="text-muted-foreground mt-2">{c.prov_sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl">
            {c.prov_plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? "border-2 border-primary bg-card" : "border-border bg-card"}`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold text-primary mb-3">
                    {c.prov_recommended}
                  </div>
                )}
                <div className="font-display text-xl font-bold mb-2">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.unit}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-5">{c.prov_trial}</div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href as "/provider/inscription"}
                  className={`rounded-lg py-2.5 text-sm font-medium text-center transition ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-secondary"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-20 max-w-2xl">
          <h2 className="font-display text-2xl font-bold mb-6">{c.faq_h2}</h2>
          <div className="space-y-4">
            {c.faq.map((item, i) => (
              <details key={i} className="rounded-xl border border-border overflow-hidden group">
                <summary className="px-5 py-4 cursor-pointer font-medium text-sm hover:bg-secondary/30 transition select-none">
                  {item.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-signal/10 border border-border p-10 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">{c.cta_h2}</h2>
          <p className="text-muted-foreground mb-6">{c.cta_desc}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/advertiser/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
            >
              {c.cta_advertiser}
            </Link>
            <Link
              to="/owner/inscription"
              className="rounded-full bg-card text-foreground border border-border px-6 py-3 font-semibold hover:bg-secondary transition"
            >
              {c.cta_owner}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
