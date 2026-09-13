import { createFileRoute } from "@tanstack/react-router";
import { LogoLink } from "@/components/app/LogoLink";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/kit")({
  head: () => ({
    meta: [
      { title: "Kit média — MoveSpot" },
      { name: "description", content: "Kit média et ressources partenaires MoveSpot : présentation, tarifs, chiffres clés et contacts." },
      { property: "og:title", content: "Kit média MoveSpot" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/kit" },
    ],
  }),
  component: KitMedia,
});

function KitMedia() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav — masqué à l'impression */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between print:hidden">
        <LogoLink />
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
        >
          <Printer className="w-4 h-4" />
          Imprimer / PDF
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 print:py-6 print:space-y-8">
        {/* En-tête */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-border pb-10 print:pb-6">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Kit média · {new Date().getFullYear()}</p>
            <h1 className="text-4xl font-black tracking-tight mb-3">MoveSpot</h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              La mobilité mondiale, monétisée localement. Publicité mobile sur véhicules —
              ciblage géographique précis, suivi GPS temps réel, campagnes dès 10 €/jour.
            </p>
          </div>
          <div className="shrink-0 text-right print:text-left">
            <p className="text-xs text-muted-foreground">Fondée en 2024</p>
            <p className="text-xs text-muted-foreground">Paris, France</p>
            <p className="text-xs text-muted-foreground mt-2">
              <a href="https://move-spot.com" className="underline underline-offset-2">move-spot.com</a>
            </p>
          </div>
        </section>

        {/* Chiffres clés */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Chiffres clés</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "1,80 €", label: "par km²/jour (ville)", sub: "2,70 € grandes agglomérations" },
              { value: "dès 10 €", label: "budget campagne", sub: "sans abonnement" },
              { value: "70 / 30", label: "reversé au propriétaire", sub: "30 % commission plateforme" },
              { value: "14 jours", label: "essai gratuit annonceur", sub: "sans CB requise" },
            ].map(({ value, label, sub }) => (
              <div key={label} className="rounded-xl border border-border p-4 flex flex-col gap-1">
                <span className="text-2xl font-black">{value}</span>
                <span className="text-sm font-medium leading-tight">{label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Types de véhicules */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Véhicules acceptés</h2>
          <div className="flex flex-wrap gap-2">
            {["Taxi", "VTC", "Van publicitaire", "Scooter", "Vélo cargo", "Food truck", "Camion léger", "Voiture", "Autre"].map((v) => (
              <span key={v} className="rounded-full border border-border px-3 py-1 text-sm">{v}</span>
            ))}
          </div>
        </section>

        {/* Proposition de valeur par rôle */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Pour chaque acteur</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                role: "Annonceur",
                icon: "📣",
                points: ["Brief en 5 min", "Ciblage par zone GPS", "Rapport de diffusion", "Essai 14 jours offert"],
              },
              {
                role: "Propriétaire de flotte",
                icon: "🚗",
                points: ["Inscription gratuite", "70 % des revenus reversés", "Tableau de bord flotte", "Validation des briefs"],
              },
              {
                role: "Prestataire (poseur)",
                icon: "🛠️",
                points: ["Gestion des chantiers", "Photos d'installation", "Portfolio clients", "Facturation intégrée"],
              },
            ].map(({ role, icon, points }) => (
              <div key={role} className="rounded-xl border border-border p-5 space-y-3">
                <p className="text-2xl">{icon}</p>
                <h3 className="font-bold">{role}</h3>
                <ul className="space-y-1">
                  {points.map((p) => (
                    <li key={p} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Tarifs résumé */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Tarifs résumé</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-6 font-semibold">Profil</th>
                  <th className="text-left py-2 pr-6 font-semibold">Modèle</th>
                  <th className="text-left py-2 font-semibold">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { profil: "Propriétaire", modele: "Gratuit", detail: "Commission prélevée sur chaque campagne diffusée" },
                  { profil: "Annonceur particulier", modele: "30 % commission", detail: "Du budget campagne — pas d'abonnement" },
                  { profil: "Annonceur PME", modele: "25 % commission", detail: "À partir de 500 €/mois de budget" },
                  { profil: "Annonceur grand compte", modele: "Sur devis", detail: "Tarif négocié, SLA dédié" },
                  { profil: "Prestataire Starter", modele: "29 €/mois", detail: "Jusqu'à 5 clients actifs" },
                  { profil: "Prestataire Standard", modele: "42 €/mois", detail: "Jusqu'à 20 clients, portfolio avancé" },
                  { profil: "Prestataire Pro", modele: "59 €/mois", detail: "Clients illimités, marque blanche" },
                ].map(({ profil, modele, detail }) => (
                  <tr key={profil}>
                    <td className="py-2 pr-6 font-medium">{profil}</td>
                    <td className="py-2 pr-6 text-muted-foreground">{modele}</td>
                    <td className="py-2 text-muted-foreground">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Grille complète sur <a href="/tarifs" className="underline underline-offset-2">move-spot.com/tarifs</a>
          </p>
        </section>

        {/* Identité visuelle */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Palette de marque</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { name: "Signal", hex: "#FF6B35", text: "white" },
              { name: "Nuit", hex: "#0F172A", text: "white" },
              { name: "Asphalte", hex: "#334155", text: "white" },
              { name: "Ciment", hex: "#94A3B8", text: "black" },
              { name: "Blanc", hex: "#FFFFFF", text: "black", border: true },
            ].map(({ name, hex, text, border }) => (
              <div
                key={name}
                className={`rounded-lg px-4 py-3 text-sm font-medium flex flex-col gap-1 min-w-[80px]${border ? " border border-border" : ""}`}
                style={{ background: hex, color: text }}
              >
                <span>{name}</span>
                <span className="font-mono text-xs opacity-70">{hex}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Police principale : Inter (sans-serif). Logo disponible sur demande.</p>
        </section>

        {/* Contact */}
        <section className="rounded-xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold mb-1">Contact partenariat & presse</h2>
            <p className="text-sm text-muted-foreground">Pour toute demande de ressources, interview ou co-marketing :</p>
          </div>
          <div className="text-sm space-y-1 shrink-0">
            <p><a href="mailto:partenaires@move-spot.com" className="font-semibold underline underline-offset-2">partenaires@move-spot.com</a></p>
            <p className="text-muted-foreground">Réponse sous 48 h ouvrées</p>
          </div>
        </section>

        {/* Footer impression */}
        <footer className="text-xs text-muted-foreground pt-4 border-t border-border flex flex-col sm:flex-row justify-between gap-2 print:pt-4">
          <span>© {new Date().getFullYear()} MoveSpot SAS — Tous droits réservés</span>
          <span>move-spot.com · partenaires@move-spot.com</span>
        </footer>
      </main>

      {/* Styles d'impression */}
      <style>{`
        @media print {
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
          a { color: inherit; text-decoration: none; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
