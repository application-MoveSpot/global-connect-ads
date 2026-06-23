import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { CreativeFiles } from "@/components/CreativeFiles";

export const Route = createFileRoute("/annonceur/briefs/$briefId")({
  head: () => ({
    meta: [
      { title: "Détail du brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BriefDetailPage,
});

type Brief = {
  id: string;
  advertiser_id: string;
  title: string;
  description: string;
  vehicle_types: string[];
  zones: string[];
  start_date: string;
  end_date: string;
  days_count: number | null;
  budget_max: number | null;
  audience_target: string | null;
  creative_files: string[] | null;
  status: string;
};

type Proposal = {
  id: string;
  vehicle_id: string;
  owner_id: string;
  price_per_day: number;
  message: string | null;
  status: string;
  created_at: string;
};

type Vehicle = { id: string; name: string; type: string; photos: string[] | null; format_publicitaire: string | null };

function BriefDetailPage() {
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
    const { data: b } = await supabase.from("advertiser_briefs").select("*").eq("id", briefId).maybeSingle();
    if (!b) { navigate({ to: "/annonceur/briefs" }); return; }
    setBrief(b as Brief);
    const { data: ps } = await supabase.from("brief_proposals").select("*").eq("brief_id", briefId).order("created_at", { ascending: false });
    const list = (ps as Proposal[]) ?? [];
    setProposals(list);
    if (list.length > 0) {
      const { data: vs } = await supabase.from("vehicles").select("id, name, type, photos, format_publicitaire").in("id", list.map((p) => p.vehicle_id));
      const map: Record<string, Vehicle> = {};
      for (const v of (vs as Vehicle[]) ?? []) map[v.id] = v;
      setVehicles(map);
    }
    setLoading(false);
  }, [briefId, navigate]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    await supabase.from("brief_proposals").update({ status }).eq("id", id);
    await load();
  };

  const cancelBrief = async () => {
    if (!confirm("Annuler ce brief ?")) return;
    await supabase.from("advertiser_briefs").update({ status: "cancelled" }).eq("id", briefId);
    await load();
  };

  if (loading || !brief) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur/briefs" className="text-sm text-muted-foreground hover:text-foreground">← Mes briefs</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{brief.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Du {new Date(brief.start_date).toLocaleDateString("fr-FR")} au {new Date(brief.end_date).toLocaleDateString("fr-FR")} ({brief.days_count} jour(s))
            </p>
          </div>
          <StatusBadge status={brief.status} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{brief.description}</p>
          <div className="text-xs text-muted-foreground"><strong>Types recherchés :</strong> {brief.vehicle_types.join(", ")}</div>
          {brief.zones.length > 0 && <div className="text-xs text-muted-foreground"><strong>Zones :</strong> {brief.zones.join(", ")}</div>}
          {brief.budget_max && <div className="text-xs text-muted-foreground"><strong>Budget max :</strong> {brief.budget_max}€</div>}
          {brief.audience_target && <div className="text-xs text-muted-foreground"><strong>Audience :</strong> {brief.audience_target}</div>}
          <CreativeFiles paths={brief.creative_files} />
        </section>

        {brief.status === "open" && (
          <button onClick={cancelBrief} className="mb-6 text-xs text-destructive hover:underline">Annuler ce brief</button>
        )}

        <h2 className="font-display text-2xl font-bold mb-4">Propositions reçues ({proposals.length})</h2>
        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            Aucune proposition pour l'instant. Les propriétaires éligibles seront notifiés.
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const v = vehicles[p.vehicle_id];
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-4">
                    {v?.photos?.[0] && <img src={v.photos[0]} alt={v.name} className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{v?.name ?? "Véhicule"}</div>
                          <div className="text-xs text-muted-foreground">{v?.type} {v?.format_publicitaire && `· ${v.format_publicitaire}`}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-lg font-bold text-primary">{p.price_per_day}€<span className="text-xs font-normal text-muted-foreground">/jour</span></div>
                          <ProposalBadge status={p.status} />
                        </div>
                      </div>
                      {p.message && <p className="text-sm mt-2 whitespace-pre-wrap">{p.message}</p>}
                      {p.status === "pending" && brief.status === "open" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => respond(p.id, "accepted")}
                            className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-1.5 text-sm font-semibold hover:bg-signal/30">
                            ✓ Accepter
                          </button>
                          <button onClick={() => respond(p.id, "rejected")}
                            className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-1.5 text-sm font-semibold hover:bg-destructive/25">
                            ✕ Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Ouvert", cls: "bg-signal/20 text-signal" },
    closed: { label: "Fermé", cls: "bg-secondary text-foreground" },
    fulfilled: { label: "Pourvu", cls: "bg-primary/20 text-primary" },
    cancelled: { label: "Annulé", cls: "bg-destructive/15 text-destructive" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${x.cls}`}>{x.label}</span>;
}

function ProposalBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    accepted: { label: "Acceptée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
    withdrawn: { label: "Retirée", cls: "bg-muted text-muted-foreground" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${x.cls}`}>{x.label}</span>;
}
