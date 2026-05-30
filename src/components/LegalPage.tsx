import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-signal shadow-glow flex items-center justify-center font-display font-bold text-primary-foreground">
              M
            </div>
            <span className="font-display font-bold text-lg tracking-tight">MoveSpot</span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-border bg-card/50 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-card transition"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-hero opacity-40" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-12">
          <div className="text-xs uppercase tracking-widest text-primary mb-3">{eyebrow}</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <article className="legal-content space-y-8 text-foreground/90 leading-relaxed">
          {children}
        </article>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} MoveSpot. Tous droits réservés.</div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/cgu" className="hover:text-foreground transition">CGU</Link>
            <Link to="/cgv" className="hover:text-foreground transition">CGV</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition">Confidentialité</Link>
            <Link to="/cookies" className="hover:text-foreground transition">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-bold text-foreground border-l-2 border-primary pl-4">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
