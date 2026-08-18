import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { RouteSummary } from "@/components/shared/RouteSummary";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { OwnerConnectCard } from "@/components/owner/OwnerConnectCard";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";

const MobilityMap = lazy(() =>
  import("@/components/shared/MobilityMap").then((m) => ({ default: m.MobilityMap }))
);

export const Route = createFileRoute("/proprietaire/")({
  head: () => ({
    meta: [
      { title: "Espace propriétaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string;
  price_per_day: number;
  status: string;
  admin_notes: string | null;
  photos: string[] | null;
  created_at: string;
};

type Request = {
  id: string;
  vehicle_id: string | null;
  spot_name: string;
  company: string;
  email: string;
  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tab, setTab] = useState<"vehicles" | "requests">("vehicles");

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/proprietaire/inscription" }); return; }
    const { data: prof } = await supabase
      .from("owner_profiles")
      .select("id, full_name")
      .eq("user_id", sess.session.user.id)
      .maybeSingle();
    if (!prof) { navigate({ to: "/proprietaire/inscription" }); return; }
    setProfile(prof);
    const [{ data: v }, { data: r }] = await Promise.all([
      supabase.from("vehicles").select("*").eq("owner_id", prof.id).order("created_at", { ascending: false }),
      supabase.from("campaign_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setVehicles((v as Vehicle[]) ?? []);
    setRequests((r as Request[]) ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, response: "accepted" | "rejected") => {
    await supabase.from("campaign_requests").update({ owner_response: response }).eq("id", id);
    await load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Bonjour, {profile?.full_name}</h1>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <OwnerConnectCard />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <Tab active={tab === "vehicles"} onClick={() => setTab("vehicles")} count={vehicles.length}>Mes véhicules</Tab>
            <Tab active={tab === "requests"} onClick={() => setTab("requests")} count={requests.length}>Demandes reçues</Tab>
            <Link to="/proprietaire/briefs" className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition">
              Briefs ouverts →
            </Link>
            <Link to="/proprietaire/tracking" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition">
              📍 Démarrer suivi GPS
            </Link>
            <Link to="/proprietaire/flotte" className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 transition">
              🚚 Gérer ma flotte
            </Link>
            <Link to="/proprietaire/flotte/import" className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition">
              📥 Import CSV
            </Link>
            <Link to="/proprietaire/flotte/qr" className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition">
              🔳 QR codes véhicules
            </Link>
          </div>
          {tab === "vehicles" && (
            <Link to="/proprietaire/vehicules/nouveau" className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition">
              + Ajouter un véhicule
            </Link>
          )}
        </div>

        {tab === "vehicles" ? (
          vehicles.length === 0 ? (
            <Empty msg="Aucun véhicule pour le moment.">
              <Link to="/proprietaire/vehicules/nouveau" className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">Ajouter mon premier véhicule</Link>
            </Empty>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <OwnerVehicleCard key={v.id} v={v} />
              ))}
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <Empty msg="Aucune demande de campagne pour vos véhicules." />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.spot_name}</div>
                      <h3 className="font-display text-xl font-bold mt-1">{r.company}</h3>
                      <a href={`mailto:${r.email}`} className="text-sm text-primary">{r.email}</a>
                    </div>
                    <div className="text-right">
                      <ResponseBadge response={r.owner_response} />
                      <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("fr-FR")}</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 text-sm mb-4 whitespace-pre-wrap">{r.message}</div>
                  <RouteSummary zones={r.route_zones} waypoints={r.route_waypoints} pois={r.route_pois} impressionsPerDay={r.estimated_impressions_per_day} days={r.days_count} />
                  <CreativeFiles paths={r.creative_files} />
                  {r.admin_notes && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs mb-4">
                      <strong>Motif :</strong> {r.admin_notes}
                    </div>
                  )}
                  {r.owner_response === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => respond(r.id, "accepted")}
                        className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-2 text-sm font-semibold hover:bg-signal/30">
                        ✓ Accepter
                      </button>
                      <button onClick={() => respond(r.id, "rejected")}
                        className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-2 text-sm font-semibold hover:bg-destructive/25">
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-2">Aperçu illustratif des flux de véhicules</h2>
          <p className="text-sm text-muted-foreground mb-4">Visualisation indicative — données réelles branchées progressivement.</p>
          <Suspense fallback={<div className="h-64 rounded-xl bg-secondary/40 animate-pulse" />}>
            <MobilityMap />
          </Suspense>
        </section>
      </main>

      <FAQChatbot
        audience="proprietaire"
        suggestions={[
          "Comment ajouter un nouveau véhicule ?",
          "Combien de temps prend la validation ?",
          "Comment connecter Stripe pour recevoir mes paiements ?",
          "Comment accepter ou refuser une demande de campagne ?",
          "Comment démarrer le suivi GPS ?",
        ]}
      />
    </div>
  );
}

function Tab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
      {children} <span className="opacity-60">({count})</span>
    </button>
  );
}

function Empty({ msg, children }: { msg: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <p className="text-muted-foreground mb-4">{msg}</p>
      {children}
    </div>
  );
}

function OwnerVehicleCard({ v }: { v: { id: string; name: string; type: string; format_publicitaire: string | null; price_per_day: number; status: string; photos: string[] | null; admin_notes: string | null } }) {
  const photoUrls = useVehiclePhotoUrls(v.photos);
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {photoUrls[0] && (
        <img src={photoUrls[0]} alt={v.name} className="w-full h-40 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-bold">{v.name}</h3>
        <StatusBadge status={v.status} />
      </div>
      <div className="text-xs text-muted-foreground mb-3">{v.type} · {v.format_publicitaire}</div>
      <div className="font-display text-xl font-bold text-primary">{v.price_per_day}€<span className="text-sm text-muted-foreground font-normal">/jour</span></div>
      {v.admin_notes && (
        <div className="mt-3 text-xs rounded-lg bg-secondary/40 p-3 border border-border">
          <strong>Note admin :</strong> {v.admin_notes}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente validation", cls: "bg-secondary text-foreground" },
    approved: { label: "Approuvé", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusé", cls: "bg-destructive/15 text-destructive" },
    paused: { label: "En pause", cls: "bg-muted text-muted-foreground" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${x.cls}`}>{x.label}</span>;
}

function ResponseBadge({ response }: { response: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "À traiter", cls: "bg-secondary text-foreground" },
    accepted: { label: "Acceptée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
  };
  const x = map[response] ?? { label: response, cls: "bg-secondary" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${x.cls}`}>{x.label}</span>;
}
