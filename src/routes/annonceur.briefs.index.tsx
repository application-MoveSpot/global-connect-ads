import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/annonceur/briefs/")({
  component: BriefsListPage,
});

type Brief = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  vehicle_types: string[];
  zones: string[];
  created_at: string;
};

function BriefsListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const { data: bs } = await supabase
        .from("advertiser_briefs")
        .select("id, title, status, start_date, end_date, vehicle_types, zones, created_at")
        .eq("advertiser_id", sess.session.user.id)
        .order("created_at", { ascending: false });
      const list = (bs as Brief[]) ?? [];
      setBriefs(list);
      if (list.length > 0) {
        const { data: ps } = await supabase
          .from("brief_proposals")
          .select("brief_id")
          .in("brief_id", list.map((b) => b.id));
        const c: Record<string, number> = {};
        for (const p of ps ?? []) c[p.brief_id] = (c[p.brief_id] ?? 0) + 1;
        setCounts(c);
      }
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Mes briefs</h1>
            <p className="text-sm text-muted-foreground mt-1">Vos demandes ouvertes aux propriétaires.</p>
          </div>
          <Link to="/annonceur/briefs/nouveau"
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition">
            + Nouveau brief
          </Link>
        </div>

        {briefs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-muted-foreground mb-4">Aucun brief publié.</p>
            <Link to="/annonceur/briefs/nouveau" className="text-primary font-semibold hover:underline">Publier mon premier brief →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map((b) => (
              <Link key={b.id} to="/annonceur/briefs/$briefId" params={{ briefId: b.id }}
                className="block rounded-xl border border-border bg-card p-5 hover:bg-secondary/30 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-semibold">{b.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Du {new Date(b.start_date).toLocaleDateString("fr-FR")} au {new Date(b.end_date).toLocaleDateString("fr-FR")}
                      {b.zones.length > 0 && <> · {b.zones.slice(0, 3).join(", ")}{b.zones.length > 3 ? "…" : ""}</>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Types : {b.vehicle_types.join(", ")}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-muted-foreground">{counts[b.id] ?? 0} proposition(s)</span>
                  </div>
                </div>
              </Link>
            ))}
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
