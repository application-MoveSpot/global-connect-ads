import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoLink } from "@/components/LogoLink";
import { FAQChatbot } from "@/components/FAQChatbot";
import { supabase } from "@/integrations/supabase/client";

type Req = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  message: string;
  status: string;
  owner_response: string;
  created_at: string;
};

type Profile = { full_name: string; company: string | null };

export const Route = createFileRoute("/annonceur/")({
  component: AnnonceurDashboard,
});

function AnnonceurDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/annonceur/inscription" });
        return;
      }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("full_name, company")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) {
        navigate({ to: "/annonceur/inscription" });
        return;
      }
      setProfile(prof);
      const { data: reqs } = await supabase
        .from("campaign_requests")
        .select("id, spot_name, spot_location, spot_price, message, status, owner_response, created_at")
        .eq("user_id", sess.session.user.id)
        .order("created_at", { ascending: false });
      setRequests((reqs as Req[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}{profile?.company ? ` · ${profile.company}` : ""}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Mes campagnes</h1>
            <p className="text-sm text-muted-foreground mt-1">Suivez le statut de vos réservations.</p>
          </div>
          <Link to="/" hash="spots" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition">
            + Nouvelle campagne
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-muted-foreground mb-4">Vous n'avez pas encore de campagne.</p>
            <Link to="/" hash="spots" className="text-primary font-semibold hover:underline">Parcourir les véhicules →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="font-semibold">{r.spot_name}</div>
                  <div className="text-xs text-muted-foreground">{r.spot_location} · {r.spot_price}€/jour</div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-xl">{r.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge status={r.status} />
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <FAQChatbot
        audience="annonceur"
        suggestions={[
          "Comment réserver un emplacement publicitaire ?",
          "Combien de temps dure la validation de ma campagne ?",
          "Quelles sont les conditions d'annulation ?",
          "Quels contenus publicitaires sont interdits ?",
        ]}
      />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    approved: { label: "Validée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/20 text-destructive" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}
