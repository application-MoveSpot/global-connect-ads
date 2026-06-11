import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { providerServiceLabel } from "@/lib/provider-services";

export const Route = createFileRoute("/prestataires/")({
  component: ProvidersDirectory,
  head: () => ({
    meta: [
      { title: "Prestataires impression covering — MoveSpot" },
      { name: "description", content: "Annuaire des prestataires d'impression covering véhicule sur MoveSpot. Demandez un devis en ligne." },
    ],
  }),
});

type Provider = {
  user_id: string; company: string; full_name: string; description: string;
  coverage_areas: string[]; pricing_info: string | null; logo_url: string | null; website: string | null;
  services: string[];
};

function ProvidersDirectory() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("provider_profiles")
        .select("user_id, company, full_name, description, coverage_areas, pricing_info, logo_url, website")
        .eq("status", "approved").order("created_at", { ascending: false });
      setProviders((data as Provider[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = providers.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.company.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) ||
      p.coverage_areas.some((z) => z.toLowerCase().includes(s));
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/prestataire/inscription" className="text-sm rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2 font-semibold hover:bg-primary/20">
            Je suis prestataire
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">Prestataires impression covering</h1>
        <p className="text-sm text-muted-foreground mb-6">Annuaire des professionnels sélectionnés par MoveSpot pour habiller vos véhicules publicitaires.</p>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (société, zone, expertise…)"
          className="w-full rounded-full border border-border bg-card px-5 py-3 mb-6" />

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
            Aucun prestataire ne correspond à votre recherche.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <Link key={p.user_id} to="/prestataires/$providerId" params={{ providerId: p.user_id }}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition">
                <div className="flex items-start gap-3 mb-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.company} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center">
                      {p.company.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.company}</div>
                    <div className="text-xs text-muted-foreground truncate">Contact : {p.full_name}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{p.description}</p>
                {p.coverage_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.coverage_areas.slice(0, 4).map((z) => (
                      <span key={z} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{z}</span>
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
