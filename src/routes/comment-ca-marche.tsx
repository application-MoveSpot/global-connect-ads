import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — MoveSpot" },
      { name: "description", content: "MoveSpot en 3 minutes : comment annonceurs, propriétaires de véhicules et chauffeurs utilisent la marketplace de publicité mobile." },
      { property: "og:title", content: "Comment fonctionne MoveSpot" },
      { property: "og:description", content: "Annonceur, propriétaire, chauffeur : découvrez le parcours complet sur MoveSpot." },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/comment-ca-marche" }],
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
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">{n}</div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3 text-sm">
            <Link to="/annonceur" className="hover:text-primary">Annonceur</Link>
            <Link to="/proprietaire" className="hover:text-primary">Propriétaire</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Comment marche MoveSpot ?</h1>
        <p className="text-lg text-muted-foreground mb-12">
          La marketplace qui transforme tout véhicule en média publicitaire géolocalisé. Trois rôles, un flux simple, des données 100 % vérifiables.
        </p>

        {/* Annonceur */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">🎯 Annonceur (entreprise ou particulier)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title="Je crée un brief">Format, ville, dates et budget en quelques minutes. Je saisis mes étapes : l'itinéraire, les quartiers traversés, les points d'intérêt et les impressions estimées par jour se calculent automatiquement.</Step>
            <Step n={2} title="Je reçois des propositions">Les propriétaires de véhicules dont la flotte correspond au brief proposent leur prix.</Step>
            <Step n={3} title="J'accepte une offre">Un clic crée la campagne, valide les dates et déclenche la production de l'habillage.</Step>
            <Step n={4} title="Je suis en direct">Carte temps réel : positions GPS, kilomètres parcourus, zones réellement traversées. Plus de promesses, des preuves.</Step>
          </div>
        </section>

        {/* Propriétaire */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">🚚 Propriétaire de véhicule(s)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title="J'inscris ma flotte">Un véhicule ou cent — formulaire individuel ou <Link to="/proprietaire/flotte/import" className="text-primary underline">import CSV</Link>. SIRET vérifié auprès de l'INSEE.</Step>
            <Step n={2} title="Je reçois des demandes">Demandes ciblées d'annonceurs OU briefs ouverts auxquels je peux candidater.</Step>
            <Step n={3} title="J'imprime un QR par véhicule">Le QR <strong>signé cryptographiquement</strong> est collé en cabine. Impossible à falsifier.</Step>
            <Step n={4} title="J'encaisse">Paiement par campagne, dashboard flotte avec carte multi-véhicules et indicateurs (taux d'occupation, CA, km).</Step>
          </div>
        </section>

        {/* Chauffeur */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">📱 Chauffeur</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title="Je scanne le QR">Avec mon téléphone — aucune installation, aucun compte. La page <Link to="/chauffeur" search={{ t: "" }} className="text-primary underline">/chauffeur</Link> s'ouvre.</Step>
            <Step n={2} title="J'appuie sur Démarrer">Le GPS du téléphone envoie ma position toutes les 20 secondes, l'écran reste allumé (Wake Lock).</Step>
            <Step n={3} title="Je conduis">L'annonceur voit la campagne vivre en temps réel sur sa carte.</Step>
            <Step n={4} title="J'arrête en fin de tournée">Un bouton, et c'est fini. Mes données ne sont accessibles qu'à mon employeur et à l'annonceur, uniquement pendant la campagne.</Step>
          </div>
        </section>

        {/* Paiement */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">💳 Payer sa campagne</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Step n={1} title="À la zone et au jour">1,80 €/km²/jour, 2,70 € dans les grandes agglomérations, minimum 10 € par campagne. Le devis se calcule pendant que vous dessinez.</Step>
            <Step n={2} title="Ou par abonnement">Trois formules mensuelles par véhicule : Starter 29 €, Standard 42 €, Pro 59 € — avec 14 jours d'essai gratuit et résiliation à tout moment.</Step>
            <Step n={3} title="Le moyen qui vous arrange">Carte bancaire, portefeuille prépayé ou virement bancaire pour les budgets B2B.</Step>
            <Step n={4} title="Tenu informé par email">Campagne activée, virement reçu, décision de modération : chaque étape déclenche un email automatique. Dès qu'un virement est validé, la campagne passe en « payée » et la rémunération du propriétaire est enregistrée.</Step>
          </div>
        </section>

        {/* Garanties */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold mb-4">🔐 Les garanties MoveSpot</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>SIRET vérifié</strong> en temps réel (API INSEE Sirene 3.11)</li>
            <li>✅ <strong>Modération des véhicules</strong> : photos contrôlées, mauvais état refusé automatiquement</li>
            <li>✅ <strong>QR signés HMAC-SHA256</strong> : la moindre modification invalide le QR</li>
            <li>✅ <strong>Positions GPS</strong> visibles par l'annonceur uniquement pendant la fenêtre de campagne approuvée (RLS Postgres)</li>
            <li>✅ <strong>Double authentification (TOTP)</strong> disponible sur tous les comptes</li>
            <li>✅ <strong>Conformité RGPD</strong> : les positions sont liées au véhicule, pas à l'identité du chauffeur</li>
            <li>✅ <strong>Mises à jour sans coupure</strong> : les nouvelles versions se chargent sans vous déconnecter</li>
          </ul>
        </section>


        <div className="rounded-2xl bg-gradient-signal p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Prêt à démarrer ?</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/annonceur" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold">Je suis annonceur</Link>
            <Link to="/proprietaire" className="rounded-full bg-card text-foreground border border-border px-6 py-3 font-semibold">J'ai des véhicules</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
