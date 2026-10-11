import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateOwnerBriefProposal } from "@/lib/ai/owner-brief-assistant.functions";
import { track } from "@/lib/analytics/track";
import { pushNotification } from "@/hooks/useNotifications";
import { detectContact } from "@/lib/moderation/contact-detection";
import { LogoLink } from "@/components/app/LogoLink";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/owner/briefs/$briefId")({
  head: () => ({
    meta: [
      { title: "Détail du brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BriefDetailPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const callBriefAi = useServerFn(generateOwnerBriefProposal);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/owner/inscription" }); return; }
    const { data: prof } = await supabase
      .from("owner_profiles").select("id").eq("user_id", sess.session.user.id).maybeSingle();
    if (!prof) { navigate({ to: "/owner/inscription" }); return; }
    setOwnerId(prof.id);
    ownerIdRef.current = prof.id;

    const { data: b } = await supabase.from("advertiser_briefs").select("*").eq("id", briefId).maybeSingle();
    if (!b) { navigate({ to: "/owner/briefs" }); return; }
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
          if (newStatus === "accepted") pushNotification(t("owner.briefs.detail.notif_accepted"), t("owner.briefs.detail.notif_accepted_body"));
          else if (newStatus === "rejected") pushNotification(t("owner.briefs.detail.notif_rejected"), t("owner.briefs.detail.notif_rejected_body"));
        }
        void load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [briefId, load]);

  const handleAiGenerate = async () => {
    if (!brief || !vehicleId) return;
    setAiError("");
    setAiLoading(true);
    const selectedVehicle = eligibleVehicles.find((v) => v.id === vehicleId);
    try {
      const res = await callBriefAi({
        data: {
          briefTitle: brief.title,
          briefDescription: brief.description,
          briefZones: brief.zones.length > 0 ? brief.zones : undefined,
          briefDays: brief.days_count ?? undefined,
          vehicleName: selectedVehicle?.name ?? vehicleId,
          vehicleType: selectedVehicle?.type ?? "",
        },
      });
      if (!res.ok) { setAiError(res.message); return; }
      setMessage(res.message);
    } catch {
      setAiError(t("owner.briefs.detail.ai_proposal_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ownerId || !vehicleId || !price) return;
    if (message) {
      const contactHit = detectContact(message);
      if (contactHit) {
        setError(t("owner.briefs.detail.contact_detected", { label: contactHit.label.charAt(0).toUpperCase() + contactHit.label.slice(1) }));
        return;
      }
    }

    // Capture form values, then optimistically add the proposal and clear the form immediately
    const savedVehicleId = vehicleId;
    const savedPrice = price;
    const savedMessage = message;
    const optimisticId = `opt-${Date.now()}`;
    setMyProposals((prev) => [...prev, {
      id: optimisticId,
      vehicle_id: savedVehicleId,
      price_per_day: Number(savedPrice),
      message: savedMessage || null,
      status: "pending",
    }]);
    setVehicleId(""); setPrice(""); setMessage("");
    setSubmitting(true);

    const { error: insErr } = await supabase.from("brief_proposals").insert([{
      brief_id: briefId,
      vehicle_id: savedVehicleId,
      owner_id: ownerId,
      price_per_day: Number(savedPrice),
      message: savedMessage || null,
    }]);
    setSubmitting(false);

    if (insErr) {
      // Revert optimistic update and restore form
      setMyProposals((prev) => prev.filter((p) => p.id !== optimisticId));
      setVehicleId(savedVehicleId); setPrice(savedPrice); setMessage(savedMessage);
      setError(insErr.message);
      return;
    }

    void track("proposal_sent", { brief_id: briefId, vehicle_id: savedVehicleId, price_per_day: Number(savedPrice) });
    await load(); // replace optimistic entry with real server row (gets the real UUID)
  };

  const withdraw = async (id: string) => {
    // Optimistic: immediately mark as withdrawn so the button disappears
    const snapshot = myProposals;
    setMyProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: "withdrawn" } : p));
    const { error: upErr } = await supabase.from("brief_proposals").update({ status: "withdrawn" }).eq("id", id);
    if (upErr) {
      setMyProposals(snapshot); // revert on failure
    }
  };

  if (loading || !brief) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("owner.briefs.detail.loading")}</div>;

  const availableVehicles = eligibleVehicles.filter(
    (v) => !myProposals.some((p) => p.vehicle_id === v.id && p.status !== "withdrawn"),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/owner/briefs" className="text-sm text-muted-foreground hover:text-foreground">
            {t("owner.briefs.detail.back")}
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">{brief.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("owner.briefs.detail.dates", {
            from: new Date(brief.start_date).toLocaleDateString(dateLocale),
            to: new Date(brief.end_date).toLocaleDateString(dateLocale),
            days: brief.days_count,
          })}
        </p>

        <section className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{brief.description}</p>
          <div className="text-xs text-muted-foreground"><strong>{t("owner.briefs.detail.types_label")}</strong> {brief.vehicle_types.join(", ")}</div>
          {brief.zones.length > 0 && <div className="text-xs text-muted-foreground"><strong>{t("owner.briefs.detail.zones_label")}</strong> {brief.zones.join(", ")}</div>}
          {brief.budget_max && <div className="text-xs text-muted-foreground"><strong>{t("owner.briefs.detail.budget_max")}</strong> {brief.budget_max}€</div>}
          {brief.audience_target && <div className="text-xs text-muted-foreground"><strong>{t("owner.briefs.detail.audience")}</strong> {brief.audience_target}</div>}
          <CreativeFiles paths={brief.creative_files} />
        </section>

        {myProposals.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display text-xl font-bold mb-3">{t("owner.briefs.detail.my_proposals")}</h2>
            <div className="space-y-2">
              {myProposals.map((p) => {
                const v = eligibleVehicles.find((x) => x.id === p.vehicle_id);
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{v?.name ?? t("owner.briefs.detail.vehicle_fallback")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("owner.briefs.detail.proposal_line", { price: p.price_per_day, status: p.status })}
                      </div>
                    </div>
                    {p.status === "pending" && (
                      <button onClick={() => withdraw(p.id)} className="text-xs text-destructive hover:underline">
                        {t("owner.briefs.detail.withdraw")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {availableVehicles.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold mb-4">{t("owner.briefs.detail.propose_title")}</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("owner.briefs.detail.vehicle_label")}</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5">
                  <option value="">{t("owner.briefs.detail.vehicle_select")}</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type}) — {v.price_per_day}€/j</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("owner.briefs.detail.price_label")}</label>
                <input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
                <p className="text-xs text-muted-foreground mt-1">{t("owner.briefs.detail.price_hint")}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium">{t("owner.briefs.detail.message_label")}</label>
                  {vehicleId && (
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleAiGenerate}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition"
                    >
                      {aiLoading ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        "✨"
                      )}
                      {aiLoading ? t("owner.briefs.detail.ai_proposal_generating") : t("owner.briefs.detail.ai_proposal_btn")}
                    </button>
                  )}
                </div>
                {aiError && <p className="text-xs text-destructive mb-1">{aiError}</p>}
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
                  placeholder={t("owner.briefs.detail.message_placeholder")} />
                {detectContact(message) && (
                  <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    🚫 {t("owner.briefs.detail.contact_detected", { label: detectContact(message)!.label.charAt(0).toUpperCase() + detectContact(message)!.label.slice(1) })}
                  </div>
                )}
              </div>
              {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
              <div className="rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                {t("owner.briefs.detail.offplatform_warning")}
              </div>
              <button type="submit" disabled={submitting}
                className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 font-semibold hover:bg-primary/90 disabled:opacity-50">
                {submitting ? t("owner.briefs.detail.submitting") : t("owner.briefs.detail.submit")}
              </button>
            </form>
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
            {eligibleVehicles.length === 0
              ? t("owner.briefs.detail.no_eligible_vehicles")
              : t("owner.briefs.detail.all_proposed")}
          </div>
        )}
      </main>
    </div>
  );
}
