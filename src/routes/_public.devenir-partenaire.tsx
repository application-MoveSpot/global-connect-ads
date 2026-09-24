import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useId } from "react";
import { hreflangLinks } from "@/lib/seo";
import { FAQChatbot } from "@/components/app/FAQChatbot";

const FAQ_ITEMS = [
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
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
const VEHICULE_CONFIG: Record<string, { label: string; emoji: string; minPerDay: number; maxPerDay: number }> = {
  taxi:      { label: "Taxi / VTC",          emoji: "🚕", minPerDay: 17.5, maxPerDay: 49 },
  van:       { label: "Van utilitaire",       emoji: "🚐", minPerDay: 17.5, maxPerDay: 42 },
  foodtruck: { label: "Food truck",           emoji: "🍔", minPerDay: 17.5, maxPerDay: 35 },
  scooter:   { label: "Scooter livraison",    emoji: "🛵", minPerDay: 17.5, maxPerDay: 28 },
  voiture:   { label: "Voiture personnelle",  emoji: "🚗", minPerDay: 17.5, maxPerDay: 28 },
  flotte:    { label: "Flotte d'entreprise",  emoji: "🚛", minPerDay: 17.5, maxPerDay: 56 },
};

const CITY_CONFIG: Record<string, { label: string; mult: number; dense: boolean }> = {
  paris:     { label: "Paris / IDF",    mult: 1.5, dense: true  },
  lyon:      { label: "Lyon",           mult: 1.2, dense: true  },
  marseille: { label: "Marseille",      mult: 1.1, dense: true  },
  bordeaux:  { label: "Bordeaux",       mult: 1.0, dense: false },
  toulouse:  { label: "Toulouse",       mult: 1.0, dense: false },
  autre:     { label: "Autre ville",    mult: 0.85, dense: false },
};

function RevenueSimulator() {
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

  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="rounded-3xl border border-primary/30 bg-card/80 backdrop-blur p-8 md:p-10 shadow-glow">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium mb-4">
            💶 Simulateur de revenus
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold">Combien pouvez-vous gagner ?</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Basé sur le modèle réel MoveSpot — <strong>70 % du budget campagne</strong> vous revient directement, avec un minimum garanti de <strong>17,50 € / véhicule / jour actif</strong>.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Type de véhicule</label>
            <select
              value={vehicule}
              onChange={e => setVehicule(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(VEHICULE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ville principale</label>
            <select
              value={ville}
              onChange={e => setVille(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(CITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}{v.dense ? " ✦" : ""}</option>
              ))}
            </select>
            {city.dense && (
              <p className="text-xs text-primary mt-1">✦ Zone dense : tarif majoré ×1,5 pour les annonceurs</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Jours actifs / mois : <span className="text-foreground font-bold">{jours} jours</span>
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
              <span>5 j</span><span>15 j</span><span>25 j</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Nombre de véhicules : <span className="text-foreground font-bold">{nb}</span>
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
            <p className="text-xs text-muted-foreground mb-1">Par véhicule / jour</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {minDay.toLocaleString("fr-FR")} – {maxDay.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">70 % de la campagne</p>
          </div>
          <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Revenu mensuel estimé</p>
            <p className="font-display text-3xl font-bold text-primary">
              {minMois.toLocaleString("fr-FR")} – {maxMois.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">{jours} j × {nb} véh.</p>
          </div>
          <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Projection annuelle</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {minAn.toLocaleString("fr-FR")} – {maxAn.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">× 12 mois</p>
          </div>
        </div>

        {/* Formule transparente */}
        <div className="rounded-xl bg-muted/40 border border-border px-5 py-4 text-xs text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">Comment c'est calculé ? </span>
          Campagne annonceur min. <strong>25 €/véhicule/jour</strong> → vous recevez <strong>70 %</strong> soit{" "}
          <strong>17,50 € garanti/jour</strong>. Les campagnes sur zones plus larges ou en grande agglomération génèrent davantage.
          Estimation non contractuelle — les revenus dépendent des campagnes actives dans votre zone.
        </div>

        <div className="text-center">
          <Link
            to="/proprietaire/inscription"
            className="inline-block rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
          >
            Créer mon espace propriétaire →
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  const prefix = useId();
  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
      {FAQ_ITEMS.map((item, i) => {
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
  return (
    <div className="min-h-screen bg-background">
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
          🚐 Espace propriétaires
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
          Vos kilomètres,<br />
          <span className="bg-gradient-signal bg-clip-text text-transparent">votre nouveau revenu.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Propriétaire d'un food truck, van, taxi, scooter ou flotte de véhicules ? Proposez vos espaces publicitaires sur MoveSpot et générez un revenu passif sur vos trajets quotidiens.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/proprietaire/inscription" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            Créer mon espace propriétaire
          </Link>
          <Link to="/proprietaire" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Créez votre profil", d: "Inscription en 2 minutes. Renseignez vos informations et ajoutez votre premier véhicule avec photos." },
            { n: "02", t: "Validation par MoveSpot", d: "MoveSpot vérifie votre véhicule sous 48h pour garantir la qualité de la marketplace." },
            { n: "03", t: "Recevez des campagnes", d: "Les annonceurs vous contactent. Vous acceptez ou refusez chaque demande, et empochez le revenu." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-mono text-primary mb-2">{s.n}</div>
              <h3 className="font-display text-xl font-bold mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Quels véhicules ?</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {["Food truck", "Van utilitaire", "Taxi / VTC", "Scooter livraison", "Voiture", "Flotte d'entreprise"].map((v) => (
            <span key={v} className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium">{v}</span>
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
                Publicité extérieure : ce que dit la réglementation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                L'affichage publicitaire sur véhicules et dans l'espace public est encadré par le Code de
                l'environnement (articles L.581-1 et suivants) et le règlement local de publicité (RLP) de chaque commune.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  La <strong>publicité lumineuse</strong> est interdite dans les agglomérations de moins de
                  10 000 habitants ne faisant pas partie d'une unité urbaine de plus de 100 000 habitants.
                </li>
                <li>
                  La publicité est interdite sur les <strong>immeubles classés ou inscrits</strong>, monuments
                  historiques, arbres, et dans les sites protégés (parcs nationaux, réserves naturelles).
                </li>
                <li>
                  Les <strong>véhicules utilisés ou équipés principalement à des fins publicitaires</strong> ne
                  peuvent pas stationner ou circuler dans certaines zones (article R.581-48 du Code de
                  l'environnement).
                </li>
                <li>
                  Les formats, surfaces et emplacements doivent respecter le <strong>RLP de la commune</strong>{" "}
                  concernée.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Source :{" "}
                <a
                  href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F22397"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  service-public.fr — Réglementation de la publicité extérieure
                </a>
                . MoveSpot vérifie chaque campagne pour garantir sa conformité.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16" aria-labelledby="faq-title">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium mb-4">
            💬 Questions fréquentes
          </span>
          <h2 id="faq-title" className="font-display text-3xl font-bold">Tout ce qu'il faut savoir</h2>
        </div>
        <FAQAccordion />
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Prêt à monétiser vos trajets ?</h2>
        <Link to="/proprietaire/inscription" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
          Commencer maintenant
        </Link>
        <p className="text-sm text-muted-foreground mt-8">
          Vous êtes apporteur d'affaires, agence ou revendeur ?{" "}
          <Link to="/partenaire/inscription" className="underline hover:text-foreground">
            Rejoignez le programme partenaire
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
          "Quels véhicules puis-je inscrire ?",
          "Combien je peux gagner par mois ?",
          "Combien de temps prend la validation de mon véhicule ?",
          "Que dit la réglementation sur la pub mobile ?",
        ]}
      />
    </div>
  );
}
