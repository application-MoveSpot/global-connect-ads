import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ShieldCheck, Landmark, ArrowRight } from "lucide-react";
import heroImage from "@/assets/poseur-atelier-covering.jpg";
import { PROVIDER_PLANS, PROVIDER_TRIAL_DAYS } from "@/lib/providers/provider-plans";
import {
  SETUP_FEE_HT_CENTS,
  INCIDENT_CHARGE_TTC_CENTS,
  TRAVEL_SUPPLEMENT_TTC_CENTS,
} from "@/lib/payments/setup-fee";

const TITLE = "Poseur / Atelier covering & signalétique — Recevez des missions MoveSpot";
const DESCRIPTION =
  "MoveSpot met en relation annonceurs, propriétaires de véhicules et poseurs. Zéro démarchage : les missions viennent des campagnes réservées. Pose validée sur 4 photos, assurance RC Pro vérifiée, paiement sécurisé via Stripe Connect.";
const OG_IMAGE = "https://move-spot.com/og-poseur.jpg";

export const Route = createFileRoute("/_public/devenir-poseur")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Les missions arrivent. Vous posez. — MoveSpot" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://move-spot.com/devenir-poseur" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Les missions arrivent. Vous posez. — MoveSpot" },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/devenir-poseur" }],
  }),
  component: DevenirPoseur,
});

const euros = (cents: number) => `${(cents / 100).toLocaleString("fr-FR")} €`;

const PROTOCOL = [
  {
    icon: Camera,
    title: "Pose validée sur 4 photos",
    desc: "À la fin de chaque pose, vous envoyez 4 photos depuis l'application : face avant, face arrière, profil gauche et profil droit. L'équipe MoveSpot les valide avant le démarrage de la campagne.",
  },
  {
    icon: ShieldCheck,
    title: "Assurance RC Pro vérifiée",
    desc: "Votre attestation de responsabilité civile professionnelle est demandée à l'inscription, avec votre Kbis et votre RIB, puis vérifiée avant toute première mission. Elle est à renouveler chaque année.",
  },
  {
    icon: Landmark,
    title: "Paiement sécurisé via Stripe Connect",
    desc: "Le paiement est déclenché par la plateforme après validation des photos, sur votre compte Stripe Connect. Délai de règlement prévu au contrat : 7 jours ouvrés après validation.",
  },
] as const;

const STEPS = [
  {
    title: "Créez votre profil d'atelier",
    desc: "SIRET, prestations proposées, zones d'intervention, portfolio et documents (Kbis, RC Pro, RIB).",
  },
  {
    title: "Les missions arrivent",
    desc: "Quand un annonceur réserve une campagne sur un véhicule de votre zone, la mission de pose apparaît dans votre espace. Vous n'avez personne à démarcher.",
  },
  {
    title: "Vous posez, vous photographiez",
    desc: "Vous réalisez la pose puis envoyez les 4 photos obligatoires depuis l'application.",
  },
  {
    title: "Vous êtes payé",
    desc: "Une fois les photos validées par MoveSpot, le paiement part vers votre compte Stripe Connect.",
  },
] as const;

const FEE_ROWS = [
  { label: "Stickers, affiche, box LED (simple)", tier: "simple" },
  { label: "Demi-covering (double)", tier: "double" },
  { label: "Covering total (complet)", tier: "complet" },
] as const;

function DevenirPoseur() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt=""
          fetchPriority="high"
          width={1600}
          height={848}
          className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] md:object-right"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/90 to-background/30" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-20 md:pt-28 md:pb-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary mb-6">
              Poseur / Atelier covering &amp; signalétique
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Les missions arrivent.
              <br />
              <span className="text-primary">Vous posez.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              MoveSpot est une marketplace de mise en relation entre annonceurs, propriétaires de
              véhicules et poseurs. <strong className="text-foreground">Zéro démarchage</strong> de
              votre côté : vos missions viennent des campagnes réservées par les annonceurs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/provider/inscription"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
              >
                Créer mon profil poseur <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/contrat-poseurs"
                className="rounded-full border border-border bg-card/60 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition"
              >
                Lire le contrat poseurs
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              MoveSpot ne promet aucun volume de missions ni aucun revenu : ils dépendent des
              campagnes réservées dans votre zone d'intervention.
            </p>
          </div>
        </div>
      </section>

      {/* Protocole de validation */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">
          Protocole de la plateforme
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">
          Trois garanties, pour chaque pose
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PROTOCOL.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="size-7 text-primary mb-4" aria-hidden />
              <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Étapes */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-mono text-primary mb-2">0{i + 1}</div>
              <h3 className="font-display text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">
          Abonnement prestataire
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
          {PROVIDER_TRIAL_DAYS} jours d'essai gratuit, puis un plan au choix
        </h2>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          L'abonnement rend votre atelier visible dans l'annuaire des prestataires MoveSpot. Sans
          engagement, résiliable à tout moment.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {PROVIDER_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {plan.label}
              </h3>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold text-primary">
                  {plan.amountEur} €
                </span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {PROVIDER_TRIAL_DAYS} jours d'essai gratuit
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Barème réel */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">
          Frais de la plateforme
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
          Le barème appliqué, sans surprise
        </h2>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Ces montants sont ceux des conditions générales de MoveSpot. Ils sont facturés à
          l'annonceur ou refacturés au propriétaire selon les cas : ce ne sont pas des promesses de
          revenu pour le poseur. Vos tarifs de pose et de dépose figurent dans le barème consultable
          dans votre espace prestataire.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Format</th>
                <th className="px-5 py-3 font-medium">
                  Forfait mise en service
                  <span className="block text-xs font-normal">campagnes de moins de 15 jours</span>
                </th>
                <th className="px-5 py-3 font-medium">
                  Refacturation incident
                  <span className="block text-xs font-normal">après rejet par MoveSpot</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEE_ROWS.map((r) => (
                <tr key={r.tier} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{r.label}</td>
                  <td className="px-5 py-3 font-semibold">
                    {euros(SETUP_FEE_HT_CENTS[r.tier])} HT
                  </td>
                  <td className="px-5 py-3 font-semibold">
                    {euros(INCIDENT_CHARGE_TTC_CENTS[r.tier])} TTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Supplément déplacement hors atelier (jusqu'à 25 km) :{" "}
          <strong className="text-foreground">{euros(TRAVEL_SUPPLEMENT_TTC_CENTS)} TTC</strong>.
          Aucun forfait de mise en service pour les campagnes de 15 jours et plus.
        </p>
      </section>

      {/* CTA final */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
          Prêt à recevoir vos premières missions ?
        </h2>
        <p className="text-muted-foreground mb-8">
          Inscription en ligne, vérification de vos documents, puis accès à votre espace poseur.
        </p>
        <Link
          to="/provider/inscription"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
        >
          Créer mon profil poseur <ArrowRight className="size-4" aria-hidden />
        </Link>
        <p className="text-sm text-muted-foreground mt-8">
          Vous possédez un véhicule ?{" "}
          <Link to="/devenir-partenaire" className="underline hover:text-foreground">
            Voir l'offre propriétaires
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
