import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { MobilityMap } from "@/components/shared/MobilityMap";
import { AdSpots, type Spot } from "@/components/shared/AdSpots";
import { BookingForm } from "@/components/shared/BookingForm";
import logo from "@/assets/movespot-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoveSpot — Marketplace de publicité mobile sur véhicules" },
      { name: "description", content: "MoveSpot met en relation annonceurs et propriétaires de véhicules (food trucks, vans, taxis, scooters de livraison) pour louer des espaces publicitaires mobiles à la journée." },
      { name: "keywords", content: "publicité mobile, marketplace publicitaire véhicules, food truck publicité, habillage van, taxi publicité, scooter livraison pub, DOOH mobile" },
      { property: "og:title", content: "MoveSpot — Marketplace de publicité mobile" },
      { property: "og:description", content: "Louez des espaces publicitaires sur food trucks, vans, taxis et scooters de livraison. Réservation à la journée, sans engagement." },
      { property: "og:url", content: "https://move-spot.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="MoveSpot" width={32} height={32} className="h-8 w-8" />
            <span className="font-display font-bold text-lg tracking-tight">MoveSpot</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#map" className="hover:text-foreground transition">Temps réel</a>
            <a href="#spots" className="hover:text-foreground transition">Véhicules</a>
            <Link to="/comment-ca-marche" className="hover:text-foreground transition">Comment ça marche</Link>
            <Link to="/devenir-partenaire" className="hover:text-foreground transition">Devenir partenaire</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/annonceur" className="hidden sm:inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition">
              Espace annonceur
            </Link>
            <Link to="/proprietaire" className="hidden md:inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition">
              Espace propriétaire
            </Link>
            <a href="#spots" className="hidden sm:inline-block rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition">
              Réserver
            </a>
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card hover:bg-secondary transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1 text-sm">
              <a href="#map" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Temps réel</a>
              <a href="#spots" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Véhicules</a>
              <Link to="/comment-ca-marche" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Comment ça marche</Link>
              <Link to="/devenir-partenaire" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Devenir partenaire</Link>
              <div className="h-px bg-border my-2" />
              <Link to="/annonceur" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">Espace annonceur</Link>
              <Link to="/proprietaire" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">Espace propriétaire</Link>
              <a href="#spots" onClick={() => setMobileMenuOpen(false)} className="mt-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-center font-semibold">Réserver</a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            Plateforme en ligne · suivi GPS & paiements actifs
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            Vos pubs roulent,<br />
            <span className="bg-gradient-signal bg-clip-text text-transparent">vos ventes décollent.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            MoveSpot est la marketplace qui met en relation <strong className="text-foreground">annonceurs</strong> et <strong className="text-foreground">propriétaires de véhicules</strong> — food trucks, vans, taxis, VTC, scooters de livraison. Vous dessinez votre zone, le budget se calcule au km², et chaque kilomètre diffusé est prouvé par GPS.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#map" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
              Découvrir l'aperçu
            </a>
            <a href="/pitch" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
              Voir le pitch
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {[
              { k: "1,80 €", v: "par km² et par jour (2,70 € en grande agglomération)" },
              { k: "10 €", v: "budget minimum pour lancer une campagne" },
              { k: "70 / 30", v: "reversé aux partenaires / commission MoveSpot" },
              { k: "14 j", v: "d'essai gratuit sur les campagnes par abonnement" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-4">
                <dt className="font-display text-2xl font-bold">{s.k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Ce qui est en place */}
      <section className="max-w-7xl mx-auto px-6 pt-4 pb-8">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">● Ce qui est en place</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold">Une plateforme complète, déjà opérationnelle</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: "Zones dessinées sur carte", d: "Vous tracez votre polygone de diffusion ; la surface et le budget se calculent automatiquement, avec majoration en zone dense." },
            { t: "Preuve de diffusion", d: "Positions GPS envoyées par lots puis agrégées : kilomètres réels, minutes actives et taux de couverture de votre zone." },
            { t: "Paiements souples", d: "Carte bancaire, abonnement avec essai de 14 jours, portefeuille prépayé ou virement bancaire pour les budgets B2B." },
            { t: "Confiance vérifiée", d: "SIRET contrôlé, QR véhicules signés, pose validée sur 4 photos, double authentification et modération humaine." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display font-bold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/comment-ca-marche" className="text-sm text-primary hover:underline">Voir le parcours complet →</Link>
        </div>
      </section>

      {/* Map */}
      <section id="map" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">● Aperçu</div>
            <h2 className="font-display text-4xl font-bold">Véhicules en circulation</h2>
            <p className="text-muted-foreground mt-2">Aperçu des flux de véhicules. Sur une campagne active, cette carte affiche les positions réelles, les kilomètres parcourus et la part du trajet réalisée dans votre zone.</p>
          </div>
        </div>

        <MobilityMap />
      </section>

      {/* Ad Spots */}
      <section id="spots" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <AdSpots onSelect={setSelectedSpot} />
      </section>


      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} MoveSpot. Tous droits réservés.</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/cgu" className="hover:text-foreground transition">CGU</Link>
            <Link to="/cgv" className="hover:text-foreground transition">CGV</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition">Confidentialité</Link>
            <Link to="/cookies" className="hover:text-foreground transition">Cookies</Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition">Mentions légales</Link>
            <Link to="/admin" className="opacity-60 hover:opacity-100 transition">Admin</Link>
          </div>
        </div>
      </footer>

      <BookingForm spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
    </div>
  );
}
