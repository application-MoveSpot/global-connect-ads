import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_public/brief/$briefId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicBriefPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type PublicBrief = {
  id: string;
  title: string;
  description: string;
  vehicle_types: string[];
  zones: string[];
  start_date: string;
  end_date: string;
  days_count: number | null;
  budget_max: number | null;
  status: string;
  audience_target: string | null;
  ad_format: string | null;
  created_at: string;
};

const VEHICLE_LABELS: Record<string, string> = {
  camion_led: "Camion LED",
  food_truck: "Food truck",
  van: "Van utilitaire",
  taxi: "Taxi / VTC",
  voiture: "Voiture",
  scooter: "Scooter livraison",
  velo_cargo: "Vélo cargo",
  velo_remorque: "Vélo remorque",
  triporteur: "Triporteur",
  tutuk: "Tutuk",
  autre: "Autre",
};

function PublicBriefPage() {
  const { briefId } = Route.useParams();
  const { i18n } = useTranslation();
  const dateLocale = i18n.language;
  const [brief, setBrief] = useState<PublicBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("advertiser_briefs")
        .select("id, title, description, vehicle_types, zones, start_date, end_date, days_count, budget_max, status, audience_target, ad_format, created_at")
        .eq("id", briefId)
        .eq("status", "open")
        .maybeSingle();
      if (!data) {
        setNotFound(true);
      } else {
        setBrief(data as PublicBrief);
      }
      setLoading(false);
    })();
  }, [briefId]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (notFound || !brief) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-5xl">🔍</div>
        <h1 className="font-display text-2xl font-bold">Brief introuvable</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Ce brief n'est plus disponible ou n'existe pas. Il a peut-être été clôturé.
        </p>
        <Link
          to="/"
          className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
        >
          Accueil MoveSpot
        </Link>
      </div>
    );
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <span className="text-xs text-muted-foreground">Annonce partagée</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Brief publicitaire</p>
              <h1 className="font-display text-2xl font-bold">{brief.title}</h1>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600">
              ● Actif
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{brief.description}</p>
        </div>

        {/* Détails */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Dates</p>
            <p className="font-semibold text-sm">
              {fmt(brief.start_date)} → {fmt(brief.end_date)}
            </p>
            {brief.days_count != null && (
              <p className="text-xs text-muted-foreground">{brief.days_count} jour{brief.days_count > 1 ? "s" : ""}</p>
            )}
          </div>

          {brief.budget_max && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Budget max</p>
              <p className="font-semibold text-sm text-primary">
                {brief.budget_max.toLocaleString(dateLocale, { style: "currency", currency: "EUR" })}
              </p>
            </div>
          )}

          {brief.vehicle_types?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Véhicules recherchés</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.vehicle_types.map((vt) => (
                  <span key={vt} className="text-xs font-medium bg-secondary px-2.5 py-0.5 rounded-full">
                    {VEHICLE_LABELS[vt] ?? vt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {brief.zones?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Zones de diffusion</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.zones.map((z) => (
                  <span key={z} className="text-xs font-medium bg-muted px-2.5 py-0.5 rounded-full">📍 {z}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lien de partage */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold">Partager ce brief</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex-1 min-w-0 font-mono text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2 truncate select-all">
              {shareUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
        </div>

        {/* CTA propriétaire */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <div className="text-3xl">🚗</div>
          <div>
            <h2 className="font-display text-xl font-bold">Vous avez un véhicule disponible ?</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Créez votre espace propriétaire gratuitement et proposez votre véhicule pour cette campagne.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/owner/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
            >
              Rejoindre en tant que propriétaire →
            </Link>
            <Link
              to="/"
              className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-secondary transition"
            >
              En savoir plus sur MoveSpot
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
