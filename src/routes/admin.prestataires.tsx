import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/admin/prestataires")({
  head: () => ({
    meta: [
      { title: "Admin · Prestataires — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminProvidersPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Provider = {
  user_id: string; company: string; siret: string | null; full_name: string; email: string;
  phone: string | null; website: string | null; description: string; coverage_areas: string[];
  portfolio_urls: string[]; pricing_info: string | null; status: string; admin_notes: string | null;
  services: string[]; created_at: string;
};

function AdminProvidersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/auth" }); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);
    const { data } = await supabase.from("provider_profiles").select("*").order("created_at", { ascending: false });
    setProviders((data as Provider[]) ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (userId: string, status: string) => {
    const notes = status === "rejected" || status === "suspended"
      ? prompt(status === "rejected" ? "Motif de refus :" : "Motif de suspension :") ?? ""
      : null;
    await supabase.from("provider_profiles").update({ status, admin_notes: notes }).eq("user_id", userId);
    await load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  if (!authed) return <div className="min-h-screen flex items-center justify-center text-destructive">Accès refusé.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Modération prestataires</h1>
        {providers.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune fiche.</div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.user_id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{p.company}</div>
                    <div className="text-xs text-muted-foreground">{p.full_name} · {p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                    {p.siret && <div className="text-xs text-muted-foreground">SIRET : {p.siret}</div>}
                    {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{p.website}</a>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    p.status === "approved" ? "bg-signal/20 text-signal" :
                    p.status === "rejected" ? "bg-destructive/15 text-destructive" :
                    p.status === "suspended" ? "bg-secondary" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}>{p.status}</span>
                </div>
                {p.services && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.services.map((s) => <span key={s} className="text-[11px] bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{providerServiceLabel(s)}</span>)}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap mb-2">{p.description}</p>
                {p.coverage_areas.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2"><strong>Zones :</strong> {p.coverage_areas.join(", ")}</div>
                )}
                {p.pricing_info && <div className="text-xs text-muted-foreground mb-2"><strong>Tarifs :</strong> {p.pricing_info}</div>}
                {p.portfolio_urls.length > 0 && (
                  <div className="text-xs mb-2"><strong className="text-muted-foreground">Portfolio :</strong>{" "}
                    {p.portfolio_urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-2">[{i + 1}]</a>)}
                  </div>
                )}
                {p.admin_notes && <div className="rounded-lg bg-secondary p-2 text-xs mb-2"><strong>Note :</strong> {p.admin_notes}</div>}
                <div className="mb-2">
                  <StatusHistory
                    entityType="provider_status"
                    entityId={p.user_id}
                    statusLabel={{ pending: "En attente", approved: "Approuvée", rejected: "Refusée", suspended: "Suspendue" }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {p.status !== "approved" && (
                    <button onClick={() => setStatus(p.user_id, "approved")} className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-3 py-1.5 text-sm font-semibold hover:bg-signal/30">✓ Approuver</button>
                  )}
                  {p.status !== "rejected" && (
                    <button onClick={() => setStatus(p.user_id, "rejected")} className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-1.5 text-sm font-semibold hover:bg-destructive/25">✕ Refuser</button>
                  )}
                  {p.status === "approved" && (
                    <button onClick={() => setStatus(p.user_id, "suspended")} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">Suspendre</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
