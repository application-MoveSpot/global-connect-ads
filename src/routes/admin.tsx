import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

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

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string;
  price_per_day: number;
  status: string;
  admin_notes: string | null;
  photos: string[] | null;
  owner_id: string;
  zones: string[] | null;
  km_per_day: number | null;
  description: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<"requests" | "vehicles">("requests");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = useCallback(async () => {
    const [{ data: reqs }, { data: vehs }] = await Promise.all([
      supabase.from("campaign_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    ]);
    setRequests((reqs as Request[]) ?? []);
    setVehicles((vehs as Vehicle[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/auth" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) { setLoading(false); return; }
      setAuthorized(true);
      await load();
      setLoading(false);
    })();
  }, [navigate, load]);

  const updateRequest = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("campaign_requests").update({ status }).eq("id", id);
    await load();
  };

  const updateVehicle = async (id: string, status: "approved" | "rejected", note?: string) => {
    await supabase.from("vehicles").update({ status, admin_notes: note ?? null }).eq("id", id);
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
          <button onClick={logout} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">Se déconnecter</button>
        </div>
      </div>
    );
  }

  const filteredReq = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const filteredVeh = filter === "all" ? vehicles : vehicles.filter((v) => v.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Dashboard admin</h1>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <TabBtn active={tab === "requests"} onClick={() => setTab("requests")}>Demandes ({requests.length})</TabBtn>
          <TabBtn active={tab === "vehicles"} onClick={() => setTab("vehicles")}>Véhicules ({vehicles.length})</TabBtn>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}>
              {f === "pending" ? "En attente" : f === "approved" ? "Approuvés" : f === "rejected" ? "Refusés" : "Tous"}
            </button>
          ))}
        </div>

        {tab === "requests" ? (
          filteredReq.length === 0 ? (
            <Empty msg="Aucune demande dans cette catégorie." />
          ) : (
            <div className="space-y-4">
              {filteredReq.map((r) => (
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
                      <button onClick={() => updateRequest(r.id, "approved")}
                        className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-2 text-sm font-semibold hover:bg-signal/30">
                        ✓ Valider
                      </button>
                      <button onClick={() => updateRequest(r.id, "rejected")}
                        className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-2 text-sm font-semibold hover:bg-destructive/25">
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredVeh.length === 0 ? (
          <Empty msg="Aucun véhicule dans cette catégorie." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredVeh.map((v) => (
              <VehicleCard key={v.id} v={v} onUpdate={updateVehicle} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function VehicleCard({ v, onUpdate }: { v: Vehicle; onUpdate: (id: string, status: "approved" | "rejected", note?: string) => Promise<void> }) {
  const [note, setNote] = useState(v.admin_notes ?? "");
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {v.photos && v.photos[0] && (
        <img src={v.photos[0]} alt={v.name} className="w-full h-40 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-bold">{v.name}</h3>
        <StatusBadge status={v.status} />
      </div>
      <div className="text-xs text-muted-foreground mb-2">{v.type} · {v.format_publicitaire}</div>
      {v.description && <p className="text-sm mb-3">{v.description}</p>}
      <div className="text-sm font-display font-bold text-primary mb-3">{v.price_per_day}€/jour</div>
      {v.zones && v.zones.length > 0 && <div className="text-xs text-muted-foreground mb-3">Zones : {v.zones.join(", ")}</div>}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note admin (raison du refus, demande de modification...)" rows={2}
        className="w-full text-xs rounded-lg bg-input border border-border px-3 py-2 mb-3" />
      <div className="flex gap-2">
        <button onClick={() => onUpdate(v.id, "approved", note)}
          className="flex-1 rounded-lg bg-signal/20 text-signal border border-signal/40 px-3 py-2 text-sm font-semibold hover:bg-signal/30">
          ✓ Approuver
        </button>
        <button onClick={() => onUpdate(v.id, "rejected", note)}
          className="flex-1 rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-2 text-sm font-semibold hover:bg-destructive/25">
          ✕ Refuser
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>{children}</button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">{msg}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
    paused: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = { pending: "En attente", approved: "Approuvé", rejected: "Refusé", paused: "En pause" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
