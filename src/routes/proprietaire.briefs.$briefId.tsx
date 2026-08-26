import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { pushNotification } from "@/hooks/useNotifications";
import { detectContact } from "@/lib/moderation/contact-detection";
import { LogoLink } from "@/components/app/LogoLink";
import { CreativeFiles } from "@/components/shared/CreativeFiles";

export const Route = createFileRoute("/proprietaire/briefs/$briefId")({
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

type Vehicle = { id: string; name: string; type: string; price_per_day: number };

type MyProposal = { id: string; vehicle_id: string; price_per_day: number; message: string | null; status: string };

function BriefDetailPage() {
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const ownerIdRef = useRef<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [eligibleVehicles, setEligibleVehicles] = useState<Vehicle[]>([]);
  const [myProposals, setMyProposals] = useState<MyProposal[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/proprietaire/inscription" }); return; }
    const { data: prof } = await supabase
      .from("owner_profiles").select("id").eq("user_id", sess.session.user.id).maybeSingle();
    if (!prof) { navigate({ to: "/proprietaire/inscription" }); return; }
    setOwnerId(prof.id);
    ownerIdRef.current = prof.id;

    const { data: b } = await supabase.from("advertiser_briefs").select("*").eq("id", briefId).maybeSingle();
    if (!b) { navigate({ to: "/proprietaire/briefs" }); return; }
    setBrief(b as Brief);

    const { data: vs } = await supabase
      .from("vehicles").select("id, name, type, price_per_day")
      .eq("owner_id", prof.id).eq("status", "approved")
      .in("type", (b as Brief).vehicle_types as never);
    setEligibleVehicles((vs as Vehicle[]) ?? []);

    const { data: ps } = await supabase
      .from("brief_proposals").select("id, vehicle_id, price_per_day, message, status")
      .eq("brief_id", briefId).eq("owner_id", prof.id);
    setMyProposals((ps as MyProposal[]) ?? []);

    setLoading(false);
  }, [briefId, navigate]);

  useEffect(() => { load(); }, [load]);

  // Realtime: proposal status changes on this brief (accepted/rejected by advertiser)
  useEffect(() => {
    const channel = supabase
      .channel(`brief-detail-${briefId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "brief_proposals", filter: `brief_id=eq.${briefId}` }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if ((row.owner_id as string | undefined) === ownerIdRef.current) {
          const newStatus = row.status as string | undefined;
          if (newStatus === "accepted") pushNotification("Proposition acceptée !", "L'annonceur a accepté votre proposition pour ce brief.");
          else if (newStatus === "rejected") pushNotification("Proposition refusée", "L'annonceur a refusé votre proposition pour ce brief.");
        }
        void load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [briefId, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ownerId || !vehicleId || !price) return;
    if (message) {
      const contactHit = detectContact(message);
      if (contactHit) { setError(`${contactHit.label.charAt(0).toUpperCase() + contactHit.label.slice(1)} détecté — les coordonnées personnelles ne sont pas autorisées dans les messages.`); return; }
    }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("brief_proposals").insert([{
      brief_id: briefId,
      vehicle_id: vehicleId,
      owner_id: ownerId,
      price_per_day: Number(price),
      message: message || null,
    }]);
    setSubmitting(false);
    if (insErr) { setError(insErr.message); return; }
    void track("proposal_sent", { brief_id: briefId, vehicle_id: vehicleId, price_per_day: Number(price) });
    setVehicleId(""); setPrice(""); setMessage("");
    await load();
  };

  const withdraw = async (id: string) => {
    await supabase.from("brief_proposals").update({ status: "withdrawn" }).eq("id", id);
    await load();
  };

  if (loading || !brief) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  const availableVehicles = eligibleVehicles.filter(
    (v) => !myProposals.some((p) => p.vehicle_id === v.id && p.status !== "withdrawn"),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/proprietaire/briefs" className="text-sm text-muted-foreground hover:text-foreground">← Briefs ouverts</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">{brief.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Du {new Date(brief.start_date).toLocaleDateString("fr-FR")} au {new Date(brief.end_date).toLocaleDateString("fr-FR")} ({brief.days_count} jour(s))
        </p>

        <section className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{brief.description}</p>
          <div className="text-xs text-muted-foreground"><strong>Types recherchés :</strong> {brief.vehicle_types.join(", ")}</div>
          {brief.zones.length > 0 && <div className="text-xs text-muted-foreground"><strong>Zones :</strong> {brief.zones.join(", ")}</div>}
          {brief.budget_max && <div className="text-xs text-muted-foreground"><strong>Budget max :</strong> {brief.budget_max}€</div>}
          {brief.audience_target && <div className="text-xs text-muted-foreground"><strong>Audience :</strong> {brief.audience_target}</div>}
          <CreativeFiles paths={brief.creative_files} />
        </section>

        {myProposals.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display text-xl font-bold mb-3">Mes propositions</h2>
            <div className="space-y-2">
              {myProposals.map((p) => {
                const v = eligibleVehicles.find((x) => x.id === p.vehicle_id);
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{v?.name ?? "Véhicule"}</div>
                      <div className="text-xs text-muted-foreground">{p.price_per_day}€/jour · statut : {p.status}</div>
                    </div>
                    {p.status === "pending" && (
                      <button onClick={() => withdraw(p.id)} className="text-xs text-destructive hover:underline">Retirer</button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {availableVehicles.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold mb-4">Proposer un véhicule</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Véhicule</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5">
                  <option value="">— Sélectionner —</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type}) — {v.price_per_day}€/j</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Prix proposé (€/jour)</label>
                <input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
                <p className="text-xs text-muted-foreground mt-1">Conseil : restez sous 70 % du budget max indiqué par l'annonceur pour favoriser l'acceptation.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message (optionnel)</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
                  placeholder="Précisions sur zones couvertes, disponibilité, etc." />
                {detectContact(message) && (
                  <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    🚫 {detectContact(message)!.label.charAt(0).toUpperCase() + detectContact(message)!.label.slice(1)} détecté — les coordonnées personnelles ne sont pas autorisées dans les messages.
                  </div>
                )}
              </div>
              {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
              <div className="rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                ⚠ Tout accord conclu <strong>hors de la plateforme</strong> (paiement direct, contrat privé) n'est pas couvert par les garanties MoveSpot — ni la modération, ni le suivi GPS, ni le reversement sécurisé.
              </div>
              <button type="submit" disabled={submitting}
                className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 font-semibold hover:bg-primary/90 disabled:opacity-50">
                {submitting ? "Envoi…" : "Envoyer ma proposition"}
              </button>
            </form>
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
            {eligibleVehicles.length === 0
              ? "Aucun de vos véhicules approuvés ne correspond aux types recherchés."
              : "Vous avez déjà proposé tous vos véhicules éligibles pour ce brief."}
          </div>
        )}
      </main>
    </div>
  );
}
