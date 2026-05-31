import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobilityMap } from "@/components/MobilityMap";
import { AdSpots, type Spot } from "@/components/AdSpots";
import { BookingForm } from "@/components/BookingForm";
import logo from "@/assets/movespot-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoveSpot — Publicité locale sur la mobilité partagée à Paris & Île-de-France" },
      { name: "description", content: "Réservez à la journée des emplacements publicitaires sur les stations Vélib', scooters et hubs de mobilité partagée à Paris et en Île-de-France. Pour les commerces de proximité." },
      { name: "keywords", content: "publicité commerce local Paris, affichage station Vélib, DOOH proximité, écran publicitaire mobilité partagée, publicité locale Île-de-France" },
      { property: "og:title", content: "MoveSpot — Publicité locale sur la mobilité partagée à Paris" },
      { property: "og:description", content: "Transformez chaque station Vélib' et hub de mobilité en vitrine pour votre commerce. Réservation à la journée, sans engagement." },
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
            <a href="#spots" className="hover:text-foreground transition">Emplacements</a>
            
          </nav>
          <a href="#spots" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition">
            Réserver
          </a>
        </div>
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
            Aperçu démo · projet en construction
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            La mobilité partagée,<br />
            <span className="bg-gradient-signal bg-clip-text text-transparent">vitrine de vos commerces.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            MoveSpot transforme les stations Vélib', scooters et hubs de mobilité partagée à <strong className="text-foreground">Paris &amp; en Île-de-France</strong> en espaces publicitaires réservables à la journée par les commerces de proximité. Une ambition mondiale, un déploiement local.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#map" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
              Découvrir l'aperçu
            </a>
            <a href="/pitch" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
              Voir le pitch
            </a>
          </div>
        </div>
      </section>

      {/* Map */}
      <section id="map" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">● Aperçu</div>
            <h2 className="font-display text-4xl font-bold">Visualisation de la mobilité</h2>
            <p className="text-muted-foreground mt-2">Aperçu illustratif — les données réelles seront branchées progressivement.</p>
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
            <Link to="/admin" className="opacity-60 hover:opacity-100 transition">Admin</Link>
          </div>
        </div>
      </footer>

      <BookingForm spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
    </div>
  );
}
