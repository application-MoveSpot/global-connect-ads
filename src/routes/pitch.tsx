import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/pitch")({
  head: () => ({
    meta: [
      { title: "Pitch — MoveSpot · La mobilité mondiale, monétisée localement" },
      { name: "description", content: "Pitch de présentation MoveSpot : transformer la mobilité partagée mondiale en réseau publicitaire de proximité, en temps réel." },
      { property: "og:title", content: "Pitch MoveSpot" },
      { property: "og:description", content: "La mobilité mondiale, monétisée localement. Découvrez le pitch MoveSpot." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Pitch,
});

type Slide = {
  kicker: string;
  title: React.ReactNode;
  body: React.ReactNode;
};

const slides: Slide[] = [
  {
    kicker: "01 · Vision",
    title: (
      <>
        La mobilité mondiale,<br />
        <span className="bg-gradient-signal bg-clip-text text-transparent">monétisée localement.</span>
      </>
    ),
    body: (
      <p className="slide-body-lg text-muted-foreground max-w-3xl">
        MoveSpot transforme chaque hub de mobilité partagée — vélos, scooters, voitures — en
        vitrine publicitaire pour les commerces de proximité, partout dans le monde.
      </p>
    ),
  },
  {
    kicker: "02 · Problème",
    title: <>La pub locale est cassée.</>,
    body: (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { n: "73%", t: "des commerçants jugent leur budget pub mal investi." },
          { n: "0", t: "outil simple pour cibler les flux piétons réels en temps réel." },
          { n: "8 247", t: "véhicules partagés circulent en moyenne dans une grande ville." },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6">
            <div className="font-display text-5xl font-bold bg-gradient-signal bg-clip-text text-transparent">{s.n}</div>
            <p className="mt-3 text-muted-foreground">{s.t}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "03 · Solution",
    title: <>Un réseau publicitaire vivant.</>,
    body: (
      <div className="space-y-4 max-w-3xl">
        <p className="slide-body-lg text-muted-foreground">
          Une carte mondiale temps réel des flottes partagées. Chaque hub devient un emplacement
          réservable à la journée, avec un volume d'impressions prédictible.
        </p>
        <ul className="space-y-3 text-muted-foreground">
          {[
            "Visualisation live de la mobilité (rafraîchissement 2 s)",
            "Réservation à la journée, sans intermédiaire",
            "Charte éditoriale stricte : pas de politique, religion ou contenu violent",
          ].map((l) => (
            <li key={l} className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-signal shadow-glow" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    kicker: "04 · Produit",
    title: <>Réserver un spot en 60 secondes.</>,
    body: (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { step: "1", t: "L'annonceur explore la carte et choisit un hub." },
          { step: "2", t: "Il sélectionne ses dates et soumet sa création." },
          { step: "3", t: "MoveSpot valide sous 24 h et lance la diffusion." },
        ].map((s) => (
          <div key={s.step} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6">
            <div className="h-10 w-10 rounded-full bg-gradient-signal flex items-center justify-center font-display font-bold text-primary-foreground shadow-glow">{s.step}</div>
            <p className="mt-4 text-muted-foreground">{s.t}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "05 · Marché",
    title: <>Une vague mondiale.</>,
    body: (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { n: "≈ 220 Mds$", t: "marché mondial de la publicité extérieure d'ici 2030." },
          { n: "+ 12 %", t: "croissance annuelle du DOOH (digital out-of-home)." },
          { n: "1 500+", t: "villes équipées de mobilité partagée dans le monde." },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6">
            <div className="font-display text-4xl font-bold">{s.n}</div>
            <p className="mt-3 text-muted-foreground">{s.t}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "06 · Modèle économique",
    title: <>Marge nette par jour, par hub.</>,
    body: (
      <div className="space-y-4 max-w-3xl">
        <p className="slide-body-lg text-muted-foreground">
          Tarification journalière par emplacement, calculée selon le volume d'impressions estimé.
          MoveSpot prélève une commission sur chaque campagne diffusée.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-5">
            <div className="text-xs uppercase tracking-widest text-primary">Annonceur</div>
            <p className="mt-2 text-muted-foreground">Paie à la journée, sans engagement.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-5">
            <div className="text-xs uppercase tracking-widest text-primary">MoveSpot</div>
            <p className="mt-2 text-muted-foreground">Commission + service de validation éditoriale.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    kicker: "07 · Différenciation",
    title: <>Pourquoi maintenant, pourquoi nous.</>,
    body: (
      <ul className="space-y-3 text-muted-foreground max-w-3xl">
        {[
          "Données mobilité temps réel agrégées — une première à cette échelle.",
          "Charte éditoriale claire : confiance des marques et des collectivités.",
          "Plateforme self-service : zéro friction pour les commerces locaux.",
          "Ancrage Guadeloupe + ambition mondiale dès le jour 1.",
        ].map((l) => (
          <li key={l} className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-signal shadow-glow" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    kicker: "08 · Appel",
    title: <>Rejoignez le mouvement.</>,
    body: (
      <div className="space-y-6 max-w-3xl">
        <p className="slide-body-lg text-muted-foreground">
          Nous ouvrons les premières villes pilotes. Partenaires, annonceurs, investisseurs :
          parlons-nous.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="mailto:contact@notify.move-spot.com" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            contact@notify.move-spot.com
          </a>
          <Link to="/" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
            Voir la plateforme
          </Link>
        </div>
      </div>
    ),
  },
];

function Pitch() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        setCurrent((c) => Math.min(c + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrent((c) => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = slides[current];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-signal shadow-glow flex items-center justify-center font-display font-bold text-primary-foreground">M</div>
            <span className="font-display font-bold text-lg tracking-tight">MoveSpot · Pitch</span>
          </Link>
          <div className="text-xs text-muted-foreground tracking-widest">
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div key={current} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-xs uppercase tracking-widest text-primary mb-4">{s.kicker}</div>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-10">
              {s.title}
            </h1>
            <div>{s.body}</div>
          </div>
        </div>

        {/* Nav controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            disabled={current === 0}
            className="rounded-full border border-border bg-card/70 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-card transition disabled:opacity-30"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-8 bg-primary shadow-glow" : "w-1.5 bg-border hover:bg-muted-foreground"
                }`}
                aria-label={`Aller au slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrent((c) => Math.min(c + 1, slides.length - 1))}
            disabled={current === slides.length - 1}
            className="rounded-full border border-border bg-card/70 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-card transition disabled:opacity-30"
          >
            →
          </button>
        </div>
      </main>
    </div>
  );
}
