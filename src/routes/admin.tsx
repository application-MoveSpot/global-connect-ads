import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Request = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  company: string;
  email: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("campaign_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as Request[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setAuthorized(true);
      await load();
      setLoading(false);
    })();
  }, [navigate, load]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("campaign_requests").update({ status }).eq("id", id);
    await load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Accès refusé</h1>
          <p className="text-muted-foreground mb-4">Vous n'êtes pas administrateur.</p>
          <button onClick={logout} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground">MoveSpot</Link>
            <h1 className="font-display text-2xl font-bold">Dashboard admin</h1>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Stat label="En attente" value={counts.pending} />
          <Stat label="Approuvées" value={counts.approved} />
          <Stat label="Refusées" value={counts.rejected} />
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}>
              {f === "pending" ? "En attente" : f === "approved" ? "Approuvées" : f === "rejected" ? "Refusées" : "Toutes"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Aucune demande dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.spot_name} · {r.spot_location}</div>
                    <h3 className="font-display text-xl font-bold mt-1">{r.company}</h3>
                    <a href={`mailto:${r.email}`} className="text-sm text-primary">{r.email}</a>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={r.status} />
                    <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/40 p-4 text-sm mb-4 whitespace-pre-wrap">{r.message}</div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(r.id, "approved")}
                      className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-2 text-sm font-semibold hover:bg-signal/30">
                      ✓ Valider
                    </button>
                    <button onClick={() => updateStatus(r.id, "rejected")}
                      className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-2 text-sm font-semibold hover:bg-destructive/25">
                      ✕ Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { pending: "En attente", approved: "Approuvée", rejected: "Refusée" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
