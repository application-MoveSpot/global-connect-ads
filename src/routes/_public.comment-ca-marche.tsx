import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_public/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "How MoveSpot works | Comment ça marche — MoveSpot" },
      {
        name: "description",
        content:
          "MoveSpot en 3 minutes : comment advertisers, propriétaires de véhicules et drivers utilisent la marketplace de publicité mobile.",
      },
      { property: "og:title", content: "Comment fonctionne MoveSpot" },
      {
        property: "og:description",
        content: "Annonceur, propriétaire, driver : découvrez le parcours complet sur MoveSpot.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/comment-ca-marche" },
      ...hreflangLinks("/comment-ca-marche"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Comment lancer une campagne de publicité mobile avec MoveSpot",
          description:
            "La marketplace qui transforme tout véhicule en média publicitaire géolocalisé. Trois rôles, un flux simple, des données 100 % vérifiables.",
          totalTime: "PT3M",
          supply: [
            { "@type": "HowToSupply", name: "Un compte MoveSpot (gratuit)" },
            { "@type": "HowToSupply", name: "Un visuel publicitaire (JPG ou PDF)" },
          ],
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Créer un brief",
              text: "Format, ville, dates et budget en quelques minutes. L'itinéraire, les quartiers traversés et les impressions estimées se calculent automatiquement.",
              url: "https://move-spot.com/comment-ca-marche#brief",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Recevoir des propositions",
              text: "Les propriétaires de véhicules dont la flotte correspond au brief proposent leur prix.",
              url: "https://move-spot.com/comment-ca-marche#propositions",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Accepter une offre",
              text: "Un clic crée la campagne, valide les dates et déclenche la production de l'habillage véhicule.",
              url: "https://move-spot.com/comment-ca-marche#offre",
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "Suivre la campagne en direct",
              text: "Carte temps réel : positions GPS, kilomètres parcourus, zones réellement traversées. Données vérifiables, pas de promesses.",
              url: "https://move-spot.com/comment-ca-marche#suivi",
            },
          ],
        }),
      },
    ],
  }),
  component: HowItWorks,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
          {n}
        </div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

const CONTENT = {
  fr: {
    h1: "Comment marche MoveSpot ?",
    desc: "La marketplace qui transforme tout véhicule en média publicitaire géolocalisé. Trois rôles, un flux simple, des données 100 % vérifiables.",
    advertiser_h2: "🎯 Annonceur (entreprise ou particulier)",
    advertiser: [
      {
        title: "Je crée un brief",
        body: "Format, ville, dates et budget en quelques minutes. Je saisis mes étapes : l'itinéraire, les quartiers traversés, les points d'intérêt et les impressions estimées par jour se calculent automatiquement.",
      },
      {
        title: "Je reçois des propositions",
        body: "Les propriétaires de véhicules dont la flotte correspond au brief proposent leur prix.",
      },
      {
        title: "J'accepte une offre",
        body: "Un clic crée la campagne, valide les dates et déclenche la production de l'habillage.",
      },
      {
        title: "Je suis en direct",
        body: "Carte temps réel : positions GPS, kilomètres parcourus, zones réellement traversées. Plus de promesses, des preuves.",
      },
    ],
    owner_h2: "🚚 Propriétaire de véhicule(s)",
    owner_step1_title: "J'inscris ma flotte",
    owner_step1_prefix: "Un véhicule ou cent — formulaire individuel ou ",
    owner_step1_link: "import CSV",
    owner_step1_suffix: ". SIRET vérifié auprès de l'INSEE.",
    owner: [
      {
        title: "Je reçois des demandes",
        body: "Demandes ciblées d'advertisers OU briefs ouverts auxquels je peux candidater.",
      },
      {
        title: "J'imprime un QR par véhicule",
        body: "Le QR signé cryptographiquement est collé en cabine. Impossible à falsifier.",
      },
      {
        title: "J'encaisse",
        body: "Paiement par campagne, dashboard flotte avec carte multi-véhicules et indicateurs (taux d'occupation, CA, km).",
      },
    ],
    driver_h2: "📱 Chauffeur",
    driver_step1_title: "Je scanne le QR",
    driver_step1_prefix: "Avec mon téléphone — aucune installation, aucun compte. La page ",
    driver_step1_link: "/driver",
    driver_step1_suffix: " s'ouvre.",
    driver: [
      {
        title: "J'appuie sur Démarrer",
        body: "Le GPS du téléphone envoie ma position toutes les 20 secondes, l'écran reste allumé (Wake Lock).",
      },
      {
        title: "Je conduis",
        body: "L'advertiser voit la campagne vivre en temps réel sur sa carte.",
      },
      {
        title: "J'arrête en fin de tournée",
        body: "Un bouton, et c'est fini. Mes données ne sont accessibles qu'à mon employeur et à l'advertiser, uniquement pendant la campagne.",
      },
    ],
    payment_h2: "💳 Payer sa campagne",
    payment: [
      {
        title: "À la zone et au jour",
        body: "1,80 €/km²/jour, 2,70 € dans les grandes agglomérations, minimum 25 €/jour par véhicule. Le devis se calcule pendant que vous dessinez.",
      },
      {
        title: "Ou par abonnement",
        body: "Trois formules mensuelles par véhicule : Starter 29 €, Standard 42 €, Pro 59 € — avec 14 jours d'essai gratuit et résiliation à tout moment.",
      },
      {
        title: "Le moyen qui vous arrange",
        body: "Carte bancaire, portefeuille prépayé ou virement bancaire pour les budgets B2B.",
      },
      {
        title: "Tenu informé par email",
        body: "Campagne activée, virement reçu, décision de modération : chaque étape déclenche un email automatique. Dès qu'un virement est validé, la campagne passe en « payée » et la rémunération du propriétaire est enregistrée.",
      },
    ],
    guarantees_h2: "🔐 Les garanties MoveSpot",
    guarantees: [
      "SIRET vérifié en temps réel (API INSEE Sirene 3.11)",
      "Modération des véhicules : photos contrôlées, mauvais état refusé automatiquement",
      "QR signés HMAC-SHA256 : la moindre modification invalide le QR",
      "Positions GPS visibles par l'advertiser uniquement pendant la fenêtre de campagne approuvée (RLS Postgres)",
      "Double authentification (TOTP) disponible sur tous les comptes",
      "Conformité RGPD : les positions sont liées au véhicule, pas à l'identité du driver",
      "Mises à jour sans coupure : les nouvelles versions se chargent sans vous déconnecter",
    ],
    cta_h2: "Prêt à démarrer ?",
    cta_advertiser: "Je suis advertiser",
    cta_owner: "J'ai des véhicules",
  },
  en: {
    h1: "How does MoveSpot work?",
    desc: "The marketplace that turns any vehicle into a geolocated advertising medium. Three roles, one simple flow, 100% verifiable data.",
    advertiser_h2: "🎯 Advertiser (business or individual)",
    advertiser: [
      {
        title: "I create a brief",
        body: "Format, city, dates and budget in a few minutes. I enter my waypoints: the route, neighbourhoods covered, points of interest and estimated impressions per day are calculated automatically.",
      },
      {
        title: "I receive proposals",
        body: "Vehicle owners whose fleet matches the brief offer their price.",
      },
      {
        title: "I accept an offer",
        body: "One click creates the campaign, confirms the dates and triggers production of the vehicle wrap.",
      },
      {
        title: "I track live",
        body: "Real-time map: GPS positions, kilometres covered, zones actually traversed. No promises — proof.",
      },
    ],
    owner_h2: "🚚 Vehicle owner(s)",
    owner_step1_title: "I register my fleet",
    owner_step1_prefix: "One vehicle or a hundred — individual form or ",
    owner_step1_link: "CSV import",
    owner_step1_suffix: ". SIRET verified with INSEE.",
    owner: [
      {
        title: "I receive requests",
        body: "Targeted requests from advertisers OR open briefs I can apply to.",
      },
      {
        title: "I print one QR per vehicle",
        body: "The cryptographically signed QR is placed in the cabin. Impossible to forge.",
      },
      {
        title: "I get paid",
        body: "Payment per campaign, fleet dashboard with multi-vehicle map and indicators (occupancy rate, revenue, km).",
      },
    ],
    driver_h2: "📱 Driver",
    driver_step1_title: "I scan the QR",
    driver_step1_prefix: "With my phone — no installation, no account. The ",
    driver_step1_link: "/driver",
    driver_step1_suffix: " page opens.",
    driver: [
      {
        title: "I press Start",
        body: "The phone's GPS sends my position every 20 seconds, the screen stays on (Wake Lock).",
      },
      {
        title: "I drive",
        body: "The advertiser sees the campaign come alive in real time on their map.",
      },
      {
        title: "I stop at the end of my shift",
        body: "One button and it's done. My data is only accessible to my employer and the advertiser, solely during the approved campaign window.",
      },
    ],
    payment_h2: "💳 Paying for your campaign",
    payment: [
      {
        title: "Per zone and per day",
        body: "€1.80/km²/day, €2.70 in major cities, minimum €25/day per vehicle. The quote calculates as you draw.",
      },
      {
        title: "Or by subscription",
        body: "Three monthly plans per vehicle: Starter €29, Standard €42, Pro €59 — with a 14-day free trial and cancel at any time.",
      },
      {
        title: "The way that suits you",
        body: "Credit card, prepaid wallet or bank transfer for B2B budgets.",
      },
      {
        title: "Kept informed by email",
        body: "Campaign activated, payment received, moderation decision: every step triggers an automatic email. Once a payment is confirmed, the campaign switches to 'paid' and the owner's earnings are recorded.",
      },
    ],
    guarantees_h2: "🔐 MoveSpot guarantees",
    guarantees: [
      "SIRET verified in real time (INSEE Sirene 3.11 API)",
      "Vehicle moderation: photos checked, poor condition automatically refused",
      "HMAC-SHA256 signed QR codes: any modification invalidates the QR",
      "GPS positions visible to the advertiser only during the approved campaign window (Postgres RLS)",
      "Two-factor authentication (TOTP) available on all accounts",
      "GDPR compliant: positions are linked to the vehicle, not the driver's identity",
      "Zero-downtime updates: new versions load without signing you out",
    ],
    cta_h2: "Ready to get started?",
    cta_advertiser: "I'm an advertiser",
    cta_owner: "I have vehicles",
  },
};

function HowItWorks() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? CONTENT.en : CONTENT.fr;

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{c.h1}</h1>
        <p className="text-lg text-muted-foreground mb-12">{c.desc}</p>

        {/* Annonceur / Advertiser */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">{c.advertiser_h2}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.advertiser.map((s, i) => (
              <Step key={i} n={i + 1} title={s.title}>
                {s.body}
              </Step>
            ))}
          </div>
        </section>

        {/* Propriétaire / Owner */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">{c.owner_h2}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title={c.owner_step1_title}>
              {c.owner_step1_prefix}
              <Link to="/owner/flotte/import" className="text-primary underline">
                {c.owner_step1_link}
              </Link>
              {c.owner_step1_suffix}
            </Step>
            {c.owner.map((s, i) => (
              <Step key={i} n={i + 2} title={s.title}>
                {s.body}
              </Step>
            ))}
          </div>
        </section>

        {/* Chauffeur / Driver */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">{c.driver_h2}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title={c.driver_step1_title}>
              {c.driver_step1_prefix}
              <Link to="/driver" search={{ t: "" }} className="text-primary underline">
                {c.driver_step1_link}
              </Link>
              {c.driver_step1_suffix}
            </Step>
            {c.driver.map((s, i) => (
              <Step key={i} n={i + 2} title={s.title}>
                {s.body}
              </Step>
            ))}
          </div>
        </section>

        {/* Paiement / Payment */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">{c.payment_h2}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.payment.map((s, i) => (
              <Step key={i} n={i + 1} title={s.title}>
                {s.body}
              </Step>
            ))}
          </div>
        </section>

        {/* Garanties / Guarantees */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">{c.guarantees_h2}</h2>
          <ul className="space-y-2 text-sm">
            {c.guarantees.map((g, i) => (
              <li key={i}>✅ {g}</li>
            ))}
          </ul>
        </section>

        <div className="rounded-2xl bg-gradient-signal p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">{c.cta_h2}</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/advertiser"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold"
            >
              {c.cta_advertiser}
            </Link>
            <Link
              to="/owner"
              className="rounded-full bg-card text-foreground border border-border px-6 py-3 font-semibold"
            >
              {c.cta_owner}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
