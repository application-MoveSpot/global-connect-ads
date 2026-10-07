import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useId } from "react";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { FAQChatbot } from "@/components/app/FAQChatbot";

const FAQ_ITEMS_FR = [
  {
    q: "Combien puis-je gagner par mois avec MoveSpot ?",
    a: "Le minimum garanti est de 17,50 € par véhicule et par jour actif (= 70 % du tarif plancher annonceur de 25 €). Avec 15 jours d'activité par mois, c'est au moins 262 € de revenu complémentaire net. En zone dense (Paris, Lyon, Marseille), les campagnes sont plus chères et les revenus peuvent atteindre 49 €/jour pour un taxi.",
  },
  {
    q: "Quels véhicules sont acceptés sur MoveSpot ?",
    a: "Food trucks, vans utilitaires, taxis, VTC, scooters de livraison, voitures personnelles et flottes d'entreprise. Le véhicule doit être en état de circuler et disposer d'une surface vitrée ou carrossée utilisable pour l'affichage. La validation inclut 4 photos.",
  },
  {
    q: "Est-ce compatible avec mon activité de taxi ou de VTC ?",
    a: "Oui. MoveSpot est conçu comme un revenu complémentaire 100 % passif : vous roulez comme d'habitude, le suivi GPS valide les kilomètres parcourus dans la zone de la campagne. Aucune contrainte de trajet supplémentaire.",
  },
  {
    q: "Comment et quand suis-je payé ?",
    a: "Vos revenus s'accumulent dans votre portefeuille MoveSpot au fil des campagnes actives. Vous pouvez demander un virement bancaire dès 50 € de solde. Les virements sont traités sous 3 à 5 jours ouvrés.",
  },
  {
    q: "Puis-je refuser une campagne publicitaire ?",
    a: "Oui. Chaque demande de campagne vous est soumise avec les détails (marque, visuel, zone, durée). Vous l'acceptez ou la refusez librement, sans justification requise. Vous gardez le contrôle de ce que vous portez.",
  },
  {
    q: "Y a-t-il des frais d'inscription ?",
    a: "L'inscription est totalement gratuite. MoveSpot prélève une commission de 30 % sur chaque campagne, uniquement lorsque vous générez un revenu. Pas de frais fixes, pas d'abonnement pour les propriétaires.",
  },
  {
    q: "Combien de temps dure la validation de mon véhicule ?",
    a: "La validation prend généralement 48 heures ouvrées après soumission de votre profil et des 4 photos de votre véhicule. Une fois validé, vous apparaissez sur la marketplace et pouvez recevoir des propositions d'annonceurs.",
  },
];

export const Route = createFileRoute("/_public/devenir-partenaire")({
  head: () => ({
    meta: [
      { title: "Revenu complémentaire taxi, VTC, food truck — Devenir partenaire MoveSpot" },
      { name: "description", content: "Transformez vos kilomètres en revenu complémentaire avec MoveSpot. Taxi, VTC, food truck, van ou scooter : inscription gratuite, 70 % du budget campagne vous revient, minimum garanti 17,50 €/jour." },
      { property: "og:title", content: "Revenu complémentaire sur votre véhicule — MoveSpot" },
      { property: "og:description", content: "Portez des publicités sur votre véhicule et générez jusqu'à 49 €/jour. Inscription gratuite, validation 48h." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS_FR.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Comment devenir partenaire MoveSpot et générer un revenu complémentaire",
          description: "Inscrivez-vous sur MoveSpot pour monétiser votre véhicule en portant des publicités d'annonceurs locaux.",
          step: [
            { "@type": "HowToStep", name: "Créez votre profil gratuit", text: "Inscrivez-vous en 2 minutes avec votre email. Renseignez vos informations et ajoutez votre premier véhicule avec 4 photos." },
            { "@type": "HowToStep", name: "Validation sous 48h par MoveSpot", text: "MoveSpot vérifie votre véhicule et votre SIRET pour garantir la qualité de la marketplace. Vous recevez une confirmation par email." },
            { "@type": "HowToStep", name: "Recevez des campagnes et encaissez", text: "Les annonceurs vous proposent des campagnes. Vous acceptez ou refusez librement. Chaque kilomètre parcouru dans la zone est prouvé par GPS et génère votre revenu." },
          ],
        }),
      },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/devenir-partenaire" }, ...hreflangLinks("/devenir-partenaire")],
  }),
  component: DevenirPartenaire,
});

/** Revenu journalier NET propriétaire (70 % de la campagne annonceur).
 *  minPerDay = plancher absolu : 25 € MIN_EUR_PER_DAY × 70 % = 17,50 €
 *  maxPerDay = campagne typique large zone pour ce type de véhicule × 70 %
 *  cityMult  = reflet de la demande + multiplicateur zone dense (×1,5 en agglo) */
const VEHICULE_CONFIG: Record<string, { emoji: string; minPerDay: number; maxPerDay: number }> = {
  taxi:      { emoji: "🚕", minPerDay: 17.5, maxPerDay: 49 },
  van:       { emoji: "🚐", minPerDay: 17.5, maxPerDay: 42 },
  foodtruck: { emoji: "🍔", minPerDay: 17.5, maxPerDay: 35 },
  scooter:   { emoji: "🛵", minPerDay: 17.5, maxPerDay: 28 },
  voiture:   { emoji: "🚗", minPerDay: 17.5, maxPerDay: 28 },
  flotte:    { emoji: "🚛", minPerDay: 17.5, maxPerDay: 56 },
};

const CITY_CONFIG: Record<string, { mult: number; dense: boolean }> = {
  paris:     { mult: 1.5,  dense: true  },
  lyon:      { mult: 1.2,  dense: true  },
  marseille: { mult: 1.1,  dense: true  },
  bordeaux:  { mult: 1.0,  dense: false },
  toulouse:  { mult: 1.0,  dense: false },
  autre:     { mult: 0.85, dense: false },
};

function RevenueSimulator() {
  const { t, i18n } = useTranslation();
  const [vehicule, setVehicule] = useState("taxi");
  const [ville, setVille] = useState("paris");
  const [jours, setJours] = useState(15);
  const [nb, setNb] = useState(1);

  const cfg = VEHICULE_CONFIG[vehicule];
  const city = CITY_CONFIG[ville];
  const mult = city.mult;

  const minDay  = Math.round(cfg.minPerDay * mult * 10) / 10;
  const maxDay  = Math.round(cfg.maxPerDay * mult * 10) / 10;
  const minMois = Math.round(minDay * jours * nb);
  const maxMois = Math.round(maxDay * jours * nb);
  const minAn   = minMois * 12;
  const maxAn   = maxMois * 12;

  const loc = i18n.language === "fr" ? "fr-FR" : "en-US";

  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="rounded-3xl border border-primary/30 bg-card/80 backdrop-blur p-8 md:p-10 shadow-glow">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium mb-4">
            {t("partner.sim.badge")}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold">{t("partner.sim.title")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("partner.sim.subtitle_pre")}<strong>70 % du budget campagne</strong>{t("partner.sim.subtitle_mid")}<strong>17,50 € / véhicule / jour actif</strong>.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("partner.sim.vehicle_label")}</label>
            <select
              value={vehicule}
              onChange={e => setVehicule(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(VEHICULE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {t(`partner.vehicle.${k}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("partner.sim.city_label")}</label>
            <select
              value={ville}
              onChange={e => setVille(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(CITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{t(`partner.city.${k}`)}{v.dense ? " ✦" : ""}</option>
              ))}
            </select>
            {city.dense && (
              <p className="text-xs text-primary mt-1">{t("partner.city.dense_note")}</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t("partner.sim.days_label", { days: jours })}
            </label>
            <input
              type="range"
              min={5}
              max={25}
              value={jours}
              onChange={e => setJours(Number(e.target.value))}
              className="w-full accent-primary mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5</span><span>15</span><span>25</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t("partner.sim.vehicles_label", { nb })}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={nb}
              onChange={e => setNb(Number(e.target.value))}
              className="w-full accent-primary mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span><span>10</span><span>20</span>
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("partner.sim.per_day_label")}</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {minDay.toLocaleString(loc)} – {maxDay.toLocaleString(loc)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("partner.sim.campaign_pct")}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("partner.sim.monthly_label")}</p>
            <p className="font-display text-3xl font-bold text-primary">
              {minMois.toLocaleString(loc)} – {maxMois.toLocaleString(loc)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("partner.sim.monthly_detail", { days: jours, nb })}</p>
          </div>
          <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("partner.sim.yearly_label")}</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {minAn.toLocaleString(loc)} – {maxAn.toLocaleString(loc)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("partner.sim.yearly_detail")}</p>
          </div>
        </div>

        {/* Formule transparente */}
        <div className="rounded-xl bg-muted/40 border border-border px-5 py-4 text-xs text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">{t("partner.sim.calc_label")}</span>
          {t("partner.sim.calc_text")}
        </div>

        <div className="text-center">
          <Link
            to="/proprietaire/inscription"
            className="inline-block rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
          >
            {t("partner.sim.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQAccordion() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const prefix = useId();

  const faqItems = Array.from({ length: 7 }, (_, i) => ({
    q: t(`partner.faq.q${i}`),
    a: t(`partner.faq.a${i}`),
  }));

  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
      {faqItems.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${prefix}-answer-${i}`}
              id={`${prefix}-question-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold hover:bg-muted/40 transition"
            >
              <span>{item.q}</span>
              <span className="shrink-0 text-muted-foreground text-lg leading-none select-none" aria-hidden>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              id={`${prefix}-answer-${i}`}
              role="region"
              aria-labelledby={`${prefix}-question-${i}`}
              hidden={!isOpen}
              className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DevenirPartenaire() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
          {t("partner.badge")}
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
          {t("partner.hero_line1")}<br />
          <span className="bg-gradient-signal bg-clip-text text-transparent">{t("partner.hero_line2")}</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("partner.hero_subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/proprietaire/inscription" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            {t("partner.cta_signup")}
          </Link>
          <Link to="/proprietaire" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
            {t("partner.cta_existing")}
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {(["01", "02", "03"] as const).map((n, i) => (
            <div key={n} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-mono text-primary mb-2">{n}</div>
              <h3 className="font-display text-xl font-bold mb-2">{t(`partner.steps.s${i + 1}_title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`partner.steps.s${i + 1}_desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">{t("partner.vehicles_title")}</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {(["foodtruck", "van", "taxi", "scooter", "voiture", "flotte"] as const).map((k) => (
            <span key={k} className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium">{t(`partner.vehicle.${k}`)}</span>
          ))}
        </div>
      </section>

      <RevenueSimulator />

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>⚠️</span>
            <div className="space-y-3">
              <h2 className="font-display text-xl md:text-2xl font-bold">
                {t("partner.legal.title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("partner.legal.p1")}
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li dangerouslySetInnerHTML={{ __html: t("partner.legal.item1") }} />
                <li dangerouslySetInnerHTML={{ __html: t("partner.legal.item2") }} />
                <li dangerouslySetInnerHTML={{ __html: t("partner.legal.item3") }} />
                <li dangerouslySetInnerHTML={{ __html: t("partner.legal.item4") }} />
              </ul>
              <p className="text-xs text-muted-foreground">
                {t("partner.legal.source")}{" "}
                <a
                  href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F22397"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("partner.legal.source_link")}
                </a>
                . {t("partner.legal.note")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16" aria-labelledby="faq-title">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium mb-4">
            {t("partner.faq_badge")}
          </span>
          <h2 id="faq-title" className="font-display text-3xl font-bold">{t("partner.faq_title")}</h2>
        </div>
        <FAQAccordion />
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">{t("partner.cta_bottom_title")}</h2>
        <Link to="/proprietaire/inscription" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
          {t("partner.cta_start")}
        </Link>
        <p className="text-sm text-muted-foreground mt-8">
          {t("partner.partner_promo")}{" "}
          <Link to="/partenaire/inscription" className="underline hover:text-foreground">
            {t("partner.partner_link")}
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MoveSpot
        </div>
      </footer>
      <FAQChatbot
        audience="proprietaire"
        suggestions={[
          t("partner.chatbot.s0"),
          t("partner.chatbot.s1"),
          t("partner.chatbot.s2"),
          t("partner.chatbot.s3"),
        ]}
      />
    </div>
  );
}
