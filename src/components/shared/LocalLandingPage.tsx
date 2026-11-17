import { Link } from "@tanstack/react-router";
import { MapPin, TrendingUp, Zap, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface LocalPageConfig {
  city: string;
  cityShort: string;
  zones: string[];
  highlights: { icon: string; title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-sm hover:bg-secondary/50 transition-colors"
        aria-expanded={open}
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

const STEPS = [
  {
    n: 1,
    icon: MapPin,
    title: "Dessinez votre zone",
    desc: "Tracez un polygone sur la carte interactive autour de vos quartiers cibles. Le budget se calcule en temps réel.",
  },
  {
    n: 2,
    icon: TrendingUp,
    title: "Recevez des propositions",
    desc: "Les propriétaires de véhicules dont les trajets traversent votre zone répondent à votre brief.",
  },
  {
    n: 3,
    icon: Zap,
    title: "Suivez en temps réel",
    desc: "GPS certifié, carte live, rapport PDF mensuel. Zéro estimation — 100 % de données vérifiables.",
  },
];

export function LocalLandingPage({ config }: { config: LocalPageConfig }) {
  const { city, cityShort, zones, highlights, faqs } = config;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#090D16] text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 60% 40%, #F97316 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-6">
            <MapPin className="h-3.5 w-3.5" />
            Publicité mobile locale — {city}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Publicité sur voiture<br />
            <span className="text-[#F97316]">à {city}</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mb-8 leading-relaxed">
            Lancez une campagne de publicité mobile GPS-certifiée sur les véhicules qui circulent
            dans vos quartiers cibles. Ciblage au km², preuve de passage, dès{" "}
            <strong className="text-white">25 €/jour</strong>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/advertiser/briefs/nouveau"
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] text-white font-semibold px-6 py-3 hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/25"
            >
              Lancer une campagne à {cityShort}
            </Link>
            <Link
              to="/commencer"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 text-white font-semibold px-6 py-3 hover:bg-white/10 transition-colors"
            >
              Monétiser mon véhicule à {cityShort}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Zones ciblées ──────────────────────────────────────────────────────── */}
      <section className="bg-muted/30 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Zones couvertes :
          </span>
          {zones.map((z) => (
            <span
              key={z}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
            >
              <MapPin className="h-3 w-3 text-primary" />
              {z}
            </span>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* ── Chiffres clés ───────────────────────────────────────────────────── */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { value: "25 €", label: "par véhicule / jour (minimum)" },
            { value: "17,50 €", label: "reversés au conducteur / jour actif" },
            { value: "GPS", label: "certifié — données 100 % vérifiables" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 text-center"
            >
              <div className="font-display text-3xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{s.label}</div>
            </div>
          ))}
        </section>

        {/* ── Spécificités locales ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-6">
            Publicité sur véhicule à {city} : vos atouts locaux
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-3xl mb-3">{h.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{h.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comment ça marche ───────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-6">
            Comment lancer une campagne à {cityShort} ?
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Étape {s.n}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Garanties ───────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold mb-4">Les garanties MoveSpot</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {[
              "SIRET vérifié en temps réel (INSEE Sirene)",
              "QR codes signés HMAC-SHA256 — infalsifiables",
              "Positions GPS visibles uniquement pendant la campagne",
              "Conformité RGPD — positions liées au véhicule, pas au chauffeur",
              "Rapport PDF mensuel téléchargeable",
              "Modération photos des véhicules avant validation",
            ].map((g) => (
              <li key={g} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-6">
            Questions fréquentes — publicité sur véhicule à {city}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* ── CTA final ───────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#090D16] text-white p-8 sm:p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 60% at 50% 50%, #F97316 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
              Prêt à lancer à {city} ?
            </h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Dessinez votre zone, recevez vos propositions sous 48 h, suivez vos campagnes en
              temps réel.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/advertiser/briefs/nouveau"
                className="inline-flex items-center gap-2 rounded-full bg-[#F97316] text-white font-semibold px-6 py-3 hover:bg-orange-400 transition-colors"
              >
                Lancer une campagne à {cityShort}
              </Link>
              <Link
                to="/commencer"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 text-white font-semibold px-6 py-3 hover:bg-white/10 transition-colors"
              >
                Monétiser mon véhicule à {cityShort}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
