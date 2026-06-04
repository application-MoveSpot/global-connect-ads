import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/proprietaire/briefs/")({
  component: OpenBriefsPage,
});

type Brief = {
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
  created_at: string;
};

type Proposal = { id: string; brief_id: string; status: string; price_per_day: number };

function OpenBriefsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myTypes, setMyTypes] = useState<string[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/proprietaire/inscription" }); return; }
      const { data: prof } = await supabase
        .from("owner_profiles").select("id").eq("user_id", sess.session.user.id).maybeSingle();
      if (!prof) { navigate({ to: "/proprietaire/inscription" }); return; }

      const { data: vs } = await supabase
        .from("vehicles").select("type").eq("owner_id", prof.id).eq("status", "approved");
      const types = Array.from(new Set((vs ?? []).map((v) => v.type as string)));
      setMyTypes(types);

      const { data: bs } = await supabase
        .from("advertiser_briefs").select("*").eq("status", "open").order("created_at", { ascending: false });
      const all = (bs as Brief[]) ?? [];
      const eligible = all.filter((b) => b.vehicle_types.some((t) => types.includes(t)));
      setBriefs(eligible);

      const { data: ps } = await supabase
        .from("brief_proposals").select("id, brief_id, status, price_per_day").eq("owner_id", prof.id);
      setMyProposals((ps as Proposal[]) ?? []);

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/proprietaire" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Briefs ouverts</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {myTypes.length === 0
            ? "Faites approuver au moins un véhicule pour voir des briefs compatibles."
            : `Briefs compatibles avec vos véhicules approuvés (${myTypes.join(", ")}).`}
        </p>

        {briefs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
            Aucun brief compatible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map((b) => {
              const mine = myProposals.find((p) => p.brief_id === b.id);
              return (
                <Link key={b.id} to="/proprietaire/briefs/$briefId" params={{ briefId: b.id }}
                  className="block rounded-xl border border-border bg-card p-5 hover:bg-secondary/30 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Du {new Date(b.start_date).toLocaleDateString("fr-FR")} au {new Date(b.end_date).toLocaleDateString("fr-FR")}
                        {b.zones.length > 0 && <> · {b.zones.slice(0, 3).join(", ")}</>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{b.description}</p>
                      <div className="text-xs text-muted-foreground mt-2">Types : {b.vehicle_types.join(", ")}{b.budget_max ? ` · Budget max ${b.budget_max}€` : ""}</div>
                    </div>
                    {mine && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary font-semibold flex-shrink-0">
                        Proposition {mine.status === "pending" ? "envoyée" : mine.status}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
