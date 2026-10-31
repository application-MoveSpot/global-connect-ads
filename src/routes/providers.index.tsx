import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RouteError } from "@/components/app/RouteError";
import { LogoLink } from "@/components/app/LogoLink";
import {
  PROVIDER_SERVICES,
  providerServiceLabel,
  type ProviderServiceKey,
} from "@/lib/providers/provider-services";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/providers/")({
  component: ProvidersDirectory,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
  head: () => ({
    meta: [
      { title: "Prestataires impression covering — MoveSpot" },
      {
        name: "description",
        content:
          "Annuaire des providers d'impression covering véhicule sur MoveSpot. Demandez un devis en ligne.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/providers" },
      ...hreflangLinks("/providers"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": "https://move-spot.com/providers#page",
              url: "https://move-spot.com/providers",
              name: "Annuaire des providers covering véhicule — MoveSpot",
              description:
                "Annuaire des professionnels sélectionnés par MoveSpot : covering véhicule, production vidéo publicitaire, création graphique.",
              isPartOf: { "@id": "https://move-spot.com/#website" },
            },
            {
              "@type": "Service",
              name: "Covering et habillage de véhicules publicitaires",
              description:
                "Impression et pose d'habillage publicitaire sur tout type de véhicule : food truck, van, taxi, camion LED, scooter de livraison.",
              provider: { "@id": "https://move-spot.com/#organization" },
              areaServed: { "@type": "Country", name: "France" },
              serviceType: "Impression covering véhicule",
              category: "Publicité extérieure",
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Prestations covering",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: "Impression covering adhésif" },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: "Pose et dépose d'habillage" },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: "Création graphique publicitaire" },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: "Production vidéo publicitaire" },
                  },
                ],
              },
            },
          ],
        }),
      },
    ],
  }),
});

type Provider = {
  user_id: string;
  company: string;
  full_name: string;
  description: string;
  coverage_areas: string[];
  pricing_info: string | null;
  logo_url: string | null;
  website: string | null;
  services: string[];
  similarity?: number;
};

const DEBOUNCE_MS = 600;

function ProvidersDirectory() {
  const { t } = useTranslation();
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [filtered, setFiltered] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword");
  const [q, setQ] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ProviderServiceKey | "">("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("public_provider_profiles")
        .select("user_id, company, full_name, description, coverage_areas, pricing_info, logo_url, website, services")
        .order("created_at", { ascending: false });
      const providers = (data as Provider[]) ?? [];
      setAllProviders(providers);
      setFiltered(providers);
      setLoading(false);
    })();
  }, []);

  // Search effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = q.trim();

    if (trimmed.length < 3) {
      setMode("keyword");
      setFiltered(
        allProviders.filter((p) => {
          if (serviceFilter && !p.services?.includes(serviceFilter)) return false;
          if (!trimmed) return true;
          const s = trimmed.toLowerCase();
          return (
            p.company.toLowerCase().includes(s) ||
            p.description?.toLowerCase().includes(s) ||
            p.coverage_areas?.some((z) => z.toLowerCase().includes(s))
          );
        }).map((p) => ({ ...p, similarity: undefined }))
      );
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setMode("semantic");
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("embed-query", {
          body: { text: trimmed },
        });
        if (controller.signal.aborted) return;

        if (fnError || !fnData?.embedding) {
          // Fallback to keyword
          setMode("keyword");
          const s = trimmed.toLowerCase();
          setFiltered(
            allProviders.filter((p) => {
              if (serviceFilter && !p.services?.includes(serviceFilter)) return false;
              return (
                p.company.toLowerCase().includes(s) ||
                p.description?.toLowerCase().includes(s) ||
                p.coverage_areas?.some((z) => z.toLowerCase().includes(s))
              );
            })
          );
          return;
        }

        const { data: matches } = await (supabase as any).rpc("match_providers", {
          query_embedding: fnData.embedding,
          match_threshold: 0.25,
          match_count: 30,
          filter_category: serviceFilter || null,
        });
        if (controller.signal.aborted) return;
        setFiltered((matches as Provider[]) ?? []);
      } catch {
        if (!controller.signal.aborted) setFiltered([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, serviceFilter, allProviders]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/provider/inscription"
            className="text-sm rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2 font-semibold hover:bg-primary/20"
          >
            {t("providers.annuaire.cta_provider")}
          </Link>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">{t("providers.annuaire.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("providers.annuaire.subtitle")}</p>

        <div className="relative mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("providers.annuaire.search_placeholder")}
            className="w-full rounded-full border border-border bg-card px-5 py-3 pr-12"
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {mode === "semantic" && !searching && (
          <div className="flex items-center gap-1.5 text-xs text-primary mb-4 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            {t("providers.annuaire.ai_search_active", { defaultValue: "Recherche intelligente IA activée ✨" })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setServiceFilter("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
              serviceFilter === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            {t("common.all")}
          </button>
          {PROVIDER_SERVICES.map((s) => (
            <button
              key={s.key}
              onClick={() => setServiceFilter(serviceFilter === s.key ? "" : s.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
                serviceFilter === s.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
            {t("providers.annuaire.no_results")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <Link
                key={p.user_id}
                to="/providers/$providerId"
                params={{ providerId: p.user_id }}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.company}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center">
                      {p.company.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{p.company}</span>
                      {typeof p.similarity === "number" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full shrink-0">
                          <Sparkles className="h-2.5 w-2.5" />
                          {t("providers.annuaire.match_score", {
                            score: Math.round(p.similarity * 100),
                            defaultValue: `Match à ${Math.round(p.similarity * 100)}%`,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t("common.contact_label")} {p.full_name}
                    </div>
                  </div>
                </div>
                {p.services && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.services.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full"
                      >
                        {providerServiceLabel(s)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{p.description}</p>
                {p.coverage_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.coverage_areas.slice(0, 4).map((z) => (
                      <span key={z} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                        {z}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
