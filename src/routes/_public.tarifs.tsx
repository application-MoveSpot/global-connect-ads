import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { Check, X, Minus } from "lucide-react";

export const Route = createFileRoute("/_public/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs — MoveSpot" },
      { name: "description", content: "Grille tarifaire MoveSpot : gratuit pour les propriétaires, commission transparente pour les annonceurs, abonnement pour les prestataires." },
      { property: "og:title", content: "Tarifs MoveSpot — Transparent sur les prix" },
      { property: "og:description", content: "Pas d'abonnement caché. Propriétaires : gratuit. Annonceurs : à la campagne. Prestataires : formules flexibles." },
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

const ADVERTISER_FEATURES: FeatureRow[] = [
  { label: "Inscription", particulier: "Gratuit", pme: "Gratuit", enterprise: "Gratuit" },
  { label: "Commission MoveSpot", particulier: "30 %", pme: "25 %", enterprise: "Sur devis" },
  { label: "Campagne à partir de", particulier: "10 €", pme: "10 €", enterprise: "500 €" },
  { label: "Briefs illimités", particulier: true, pme: true, enterprise: true },
  { label: "Suivi GPS temps réel", particulier: true, pme: true, enterprise: true },
  { label: "Rapport PDF exportable", particulier: false, pme: true, enterprise: true },
  { label: "Paiement par virement", particulier: false, pme: true, enterprise: true },
  { label: "Portefeuille prépayé", particulier: false, pme: true, enterprise: true },
  { label: "Factures TVA automatiques", particulier: false, pme: true, enterprise: true },
  { label: "Account manager dédié", particulier: false, pme: false, enterprise: true },
  { label: "Contrat-cadre annuel", particulier: false, pme: false, enterprise: true },
];

const OWNER_FEATURES: OwnerRow[] = [
  { label: "Inscription", particulier: "Gratuit", pro: "Gratuit" },
  { label: "Nombre de véhicules", particulier: "1 à 3", pro: "Illimité" },
  { label: "Part reversée", particulier: "70 %", pro: "70 % (négociable)" },
  { label: "Paiement par campagne", particulier: true, pro: true },
  { label: "QR d'installation inclus", particulier: true, pro: true },
  { label: "Tableau de bord basique", particulier: true, pro: true },
  { label: "Carte flotte multi-véhicules", particulier: false, pro: true },
  { label: "Import CSV de la flotte", particulier: false, pro: true },
  { label: "Indicateurs CA / km", particulier: false, pro: true },
  { label: "Gestion multi-chauffeurs", particulier: false, pro: true },
];

function Cell({ value }: { value: boolean | string | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  if (typeof value === "boolean") {
    return value
      ? <Check className="h-4 w-4 text-signal mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
  }
  return <span className="text-sm font-medium">{value}</span>;
}

function Tarifs() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Transparent sur les prix
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pas d'abonnement caché, pas de frais d'activation. Vous payez uniquement quand une campagne se réalise.
          </p>
        </div>

        {/* ── Annonceurs ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">Annonceurs</span>
            <h2 className="font-display text-3xl font-bold mt-1">Vous faites la pub — vous choisissez votre budget</h2>
            <p className="text-muted-foreground mt-2">
              Particulier, association, TPE ou grand compte : même plateforme, conditions adaptées.
            </p>
          </div>

          {/* Cards résumé */}
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {/* Particulier / Asso */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Particulier · Asso</span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">0 €</div>
              <div className="text-sm text-muted-foreground mb-1">d'inscription</div>
              <div className="text-sm font-medium mb-6">+ 30 % de commission par campagne</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Campagnes dès 10 €</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Briefs illimités</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Suivi GPS temps réel</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Paiement CB sécurisé</li>
              </ul>
              <Link to="/annonceur/inscription" className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition">
                Créer un compte
              </Link>
            </div>

            {/* PME / Startup — highlighted */}
            <div className="rounded-2xl border-2 border-primary bg-card p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full">
                Le plus populaire
              </div>
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">PME · Startup · Indépendant</span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">0 €</div>
              <div className="text-sm text-muted-foreground mb-1">d'inscription</div>
              <div className="text-sm font-medium mb-6">+ 25 % de commission par campagne</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Campagnes dès 10 €</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Briefs illimités</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Suivi GPS + rapport PDF</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Virement + portefeuille prépayé</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Factures TVA automatiques</li>
              </ul>
              <Link to="/annonceur/inscription" className="rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold text-center hover:bg-primary/90 transition shadow-glow">
                Commencer gratuitement
              </Link>
            </div>

            {/* Grand compte */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Grande entreprise · Réseau</span>
              </div>
              <div className="font-display text-4xl font-bold mb-1">Sur devis</div>
              <div className="text-sm text-muted-foreground mb-1">&nbsp;</div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-6">
                <span className="text-base">🤖</span>
                Commission et budget négociés par IA
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Tout ce qui est dans PME</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Account manager dédié</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Contrat-cadre annuel</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Onboarding personnalisé</li>
              </ul>
              <Link to="/contact" search={{ plan: "enterprise" }} className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition">
                Négocier avec notre IA →
              </Link>
            </div>
          </div>

          {/* Tableau de comparaison */}
          <details className="rounded-xl border border-border overflow-hidden">
            <summary className="px-6 py-4 cursor-pointer text-sm font-medium hover:bg-secondary/30 transition select-none flex items-center justify-between">
              <span>Voir la comparaison complète</span>
              <span className="text-muted-foreground text-xs">▼</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-secondary/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground w-1/2">Fonctionnalité</th>
                    <th className="text-center px-4 py-3 font-medium">Particulier</th>
                    <th className="text-center px-4 py-3 font-medium text-primary">PME</th>
                    <th className="text-center px-4 py-3 font-medium">Grand compte</th>
                  </tr>
                </thead>
                <tbody>
                  {ADVERTISER_FEATURES.map((row, i) => (
                    <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-center"><Cell value={row.particulier} /></td>
                      <td className="px-4 py-3 text-center"><Cell value={row.pme} /></td>
                      <td className="px-4 py-3 text-center"><Cell value={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* ── Propriétaires ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-signal">Propriétaires de véhicules</span>
            <h2 className="font-display text-3xl font-bold mt-1">Vous avez un véhicule — c'est gratuit</h2>
            <p className="text-muted-foreground mt-2">
              Particulier avec une voiture ou gestionnaire d'une flotte de cent véhicules : inscription 0 €, vous touchez 70 % de chaque campagne.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-10 max-w-3xl">
            {/* Particulier */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Particulier · 1 à 3 véhicules</span>
              </div>
              <div className="font-display text-4xl font-bold text-signal mb-1">Gratuit</div>
              <div className="text-sm text-muted-foreground mb-1">à vie</div>
              <div className="text-sm font-medium mb-6">Vous reversez 30 % à MoveSpot par campagne encaissée</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Inscription et modération incluses</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Paiement automatique par campagne</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />QR d'installation inclus</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Tableau de bord simple</li>
              </ul>
              <Link to="/proprietaire/inscription" className="rounded-lg border border-border py-2.5 text-sm font-medium text-center hover:bg-secondary transition">
                Inscrire mon véhicule
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-signal/40 bg-card p-6 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-signal/10 text-signal">Pro · Flotte illimitée</span>
              </div>
              <div className="font-display text-4xl font-bold text-signal mb-1">Gratuit</div>
              <div className="text-sm text-muted-foreground mb-1">à vie</div>
              <div className="text-sm font-medium mb-6">30 % par campagne (négociable à partir de 20 véhicules)</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Tout ce qui est dans Particulier</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Carte flotte multi-véhicules</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Import CSV + gestion multi-chauffeurs</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />Indicateurs CA, km, taux d'occupation</li>
              </ul>
              <Link to="/proprietaire/inscription" className="rounded-lg bg-signal text-white py-2.5 text-sm font-semibold text-center hover:bg-signal/90 transition">
                Inscrire ma flotte
              </Link>
            </div>
          </div>

          <details className="rounded-xl border border-border overflow-hidden max-w-3xl">
            <summary className="px-6 py-4 cursor-pointer text-sm font-medium hover:bg-secondary/30 transition select-none flex items-center justify-between">
              <span>Voir la comparaison complète</span>
              <span className="text-muted-foreground text-xs">▼</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-secondary/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground w-1/2">Fonctionnalité</th>
                    <th className="text-center px-4 py-3 font-medium">Particulier</th>
                    <th className="text-center px-4 py-3 font-medium text-signal">Pro / Flotte</th>
                  </tr>
                </thead>
                <tbody>
                  {OWNER_FEATURES.map((row, i) => (
                    <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-center"><Cell value={row.particulier} /></td>
                      <td className="px-4 py-3 text-center"><Cell value={row.pro} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* ── Prestataires ── */}
        <section className="mb-20">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Prestataires poseurs</span>
            <h2 className="font-display text-3xl font-bold mt-1">Vous posez les habillages — abonnement mensuel</h2>
            <p className="text-muted-foreground mt-2">
              Accédez aux demandes de pose géolocalisées autour de votre secteur. Résiliable à tout moment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl">
            {[
              {
                name: "Starter",
                price: "29 €",
                unit: "/mois",
                trial: "14 jours d'essai gratuit",
                features: ["5 demandes/mois", "Profil vérifié", "Messagerie intégrée"],
                cta: "Essayer gratuitement",
                href: "/prestataire/inscription",
                highlight: false,
              },
              {
                name: "Standard",
                price: "42 €",
                unit: "/mois",
                trial: "14 jours d'essai gratuit",
                features: ["20 demandes/mois", "Profil vérifié + portfolio", "Messagerie + devis intégrés", "Badge partenaire certifié"],
                cta: "Essayer gratuitement",
                href: "/prestataire/inscription",
                highlight: true,
              },
              {
                name: "Pro",
                price: "59 €",
                unit: "/mois",
                trial: "14 jours d'essai gratuit",
                features: ["Demandes illimitées", "Tout dans Standard", "Mise en avant dans les résultats", "Accès prioritaire aux grands comptes"],
                cta: "Essayer gratuitement",
                href: "/prestataire/inscription",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight ? "border-2 border-primary bg-card" : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold text-primary mb-3">★ Recommandé</div>
                )}
                <div className="font-display text-xl font-bold mb-2">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.unit}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-5">{plan.trial}</div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href as "/prestataire/inscription"}
                  className={`rounded-lg py-2.5 text-sm font-medium text-center transition ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ Tarifs ── */}
        <section className="mb-20 max-w-2xl">
          <h2 className="font-display text-2xl font-bold mb-6">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
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
                q: "Les prestataires peuvent-ils résilier à tout moment ?",
                a: "Oui, sans frais ni préavis. L'abonnement se poursuit jusqu'à la fin de la période en cours.",
              },
            ].map((faq, i) => (
              <details key={i} className="rounded-xl border border-border overflow-hidden group">
                <summary className="px-5 py-4 cursor-pointer font-medium text-sm hover:bg-secondary/30 transition select-none">
                  {faq.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-signal/10 border border-border p-10 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Prêt à démarrer ?</h2>
          <p className="text-muted-foreground mb-6">Inscription gratuite, première campagne en moins de 10 minutes.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/annonceur/inscription" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
              Je lance une campagne
            </Link>
            <Link to="/proprietaire/inscription" className="rounded-full bg-card text-foreground border border-border px-6 py-3 font-semibold hover:bg-secondary transition">
              J'inscris mon véhicule
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
