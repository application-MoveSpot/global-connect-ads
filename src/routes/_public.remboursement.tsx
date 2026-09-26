import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/_public/remboursement")({
  head: () => ({
    meta: [
      { title: "Politique de remboursement — MoveSpot" },
      { name: "description", content: "Conditions et procédure de remboursement MoveSpot pour les annonceurs." },
    ],
  }),
  component: RemboursementPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function RemboursementPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div>
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">← Accueil</Link>
          <h1 className="font-display text-4xl font-bold mb-2">Politique de remboursement</h1>
          <p className="text-muted-foreground">Dernière mise à jour : septembre 2026</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">Principe général</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MoveSpot s'engage à traiter toute demande de remboursement équitable dans les délais prévus. Les
            remboursements sont traités en euros sur le mode de paiement d'origine (portefeuille MoveSpot ou
            virement bancaire selon le cas). Aucun remboursement en espèces n'est effectué.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-xl">Cas éligibles au remboursement</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: "✅",
                title: "Campagne annulée avant démarrage",
                desc: "Remboursement intégral si la campagne n'a pas encore démarré et qu'aucun prestataire n'a engagé de frais.",
              },
              {
                icon: "✅",
                title: "Inexécution prouvée",
                desc: "Si aucun véhicule n'a été déployé sur la période prévue, un remboursement au prorata est appliqué.",
              },
              {
                icon: "✅",
                title: "Erreur de facturation",
                desc: "Montant débité différent du devis validé : remboursement de la différence sous 5 jours ouvrés.",
              },
              {
                icon: "✅",
                title: "Double paiement",
                desc: "En cas de débit en double avéré, le trop-perçu est remboursé intégralement.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                <p className="font-semibold text-sm flex items-center gap-2"><span>{c.icon}</span>{c.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-xl">Cas non éligibles</h2>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-2">
            {[
              "Campagne déjà en cours ou terminée, sauf inexécution prouvée.",
              "Brief refusé pour non-conformité à la charte de contenu (contenu interdit, mots prohibés).",
              "Annulation effectuée moins de 48 h avant la date de démarrage.",
              "Frais de prestataire (pose/dépose) engagés et confirmés.",
              "Résultats jugés insuffisants sans défaillance technique de MoveSpot.",
            ].map((item) => (
              <p key={item} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-destructive shrink-0">✕</span>{item}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">Délais de traitement</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-center text-sm">
            {[
              { label: "Accusé de réception", delay: "Immédiat" },
              { label: "Décision (approuvé / refusé)", delay: "5 jours ouvrés" },
              { label: "Virement effectif", delay: "5–10 jours ouvrés" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-secondary/40 p-3">
                <p className="font-bold text-base">{s.delay}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">Comment faire une demande ?</h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
              Connectez-vous à votre espace annonceur MoveSpot.
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
              Accédez à <strong className="text-foreground">Mes remboursements</strong> depuis votre tableau de bord.
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
              Remplissez le formulaire en précisant la campagne concernée, le montant souhaité et le motif détaillé.
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
              Notre équipe examine la demande et vous notifie par email sous 5 jours ouvrés.
            </li>
          </ol>
          <div className="pt-2">
            <Link
              to="/annonceur"
              className="inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
            >
              Faire une demande →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <h2 className="font-semibold text-xl">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Pour toute question relative à un remboursement :{" "}
            <a href="mailto:support@movespot.fr" className="text-primary underline">support@movespot.fr</a>
          </p>
        </section>
      </main>
    </div>
  );
}
