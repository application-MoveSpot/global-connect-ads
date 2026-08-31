import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { NotificationBell } from "@/components/app/NotificationBell";
import { pushNotification } from "@/hooks/useNotifications";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/proprietaire/briefs/")({
  head: () => ({
    meta: [
      { title: "Briefs reçus — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpenBriefsPage,
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
  status: string;
  created_at: string;
};

type Proposal = { id: string; brief_id: string; status: string; price_per_day: number };

const PAGE_SIZE = 20;

function OpenBriefsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [myTypes, setMyTypes] = useState<string[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);

  // Stable refs so realtime/page-change effects use fresh values without re-subscribing
  const ownerIdRef = useRef<string | null>(null);
  const myTypesRef = useRef<string[]>([]);
  const pageRef = useRef(0);
  const initDoneRef = useRef(false);
  const userChangedPage = useRef(false);
  pageRef.current = page;

  // Fetches profile + vehicle types once; returns them for page fetches
  const loadProfile = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/proprietaire/inscription" }); return null; }
    setUserId(sess.session.user.id);
    const { data: prof } = await supabase
      .from("owner_profiles").select("id").eq("user_id", sess.session.user.id).maybeSingle();
    if (!prof) { navigate({ to: "/proprietaire/inscription" }); return null; }
    setOwnerId(prof.id);
    ownerIdRef.current = prof.id;
    const { data: vs } = await supabase
      .from("vehicles").select("type").eq("owner_id", prof.id).eq("status", "approved");
    const types = Array.from(new Set((vs ?? []).map((v) => v.type as string)));
    setMyTypes(types);
    myTypesRef.current = types;
    return { profId: prof.id, types };
  }, [navigate]);

  const loadPage = useCallback(async (profId: string, types: string[], p: number) => {
    if (types.length === 0) { setBriefs([]); setTotal(0); return; }
    setPageLoading(true);
    const { data: bs, count } = await supabase
      .from("advertiser_briefs")
      .select("id, title, description, vehicle_types, zones, start_date, end_date, days_count, budget_max, status, created_at", { count: "exact" })
      .eq("status", "open")
      .overlaps("vehicle_types", types as never)
      .order("created_at", { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1);
    setBriefs((bs as Brief[]) ?? []);
    setTotal(count ?? 0);
    const { data: ps } = await supabase
      .from("brief_proposals").select("id, brief_id, status, price_per_day").eq("owner_id", profId);
    setMyProposals((ps as Proposal[]) ?? []);
    setPageLoading(false);
  }, []);

  const load = useCallback(async () => {
    const result = await loadProfile();
    if (!result) return;
    await loadPage(result.profId, result.types, 0);
    setPage(0);
    initDoneRef.current = true;
    setLoading(false);
  }, [loadProfile, loadPage]);

  useEffect(() => { void load(); }, [load]);

  // User-initiated page change: fetch the new page without re-fetching the profile
  useEffect(() => {
    if (!initDoneRef.current || !userChangedPage.current || !ownerIdRef.current) return;
    userChangedPage.current = false;
    void loadPage(ownerIdRef.current, myTypesRef.current, page);
  }, [page, loadPage]);

  // Realtime: new briefs + proposal status changes
  useEffect(() => {
    if (!ownerId) return;
    const channel = supabase
      .channel(`owner-briefs-${ownerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "advertiser_briefs" }, () => {
        pushNotification("Nouveau brief publié", "Un brief pourrait correspondre à vos véhicules.");
        setPage(0);
        void loadPage(ownerIdRef.current!, myTypesRef.current, 0);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "advertiser_briefs" }, () => {
        void loadPage(ownerIdRef.current!, myTypesRef.current, pageRef.current);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "brief_proposals", filter: `owner_id=eq.${ownerId}` }, (payload) => {
        const newStatus = (payload.new as Record<string, unknown>).status as string | undefined;
        if (newStatus === "accepted") pushNotification("Proposition acceptée !", "Un annonceur a accepté votre proposition.");
        else if (newStatus === "rejected") pushNotification("Proposition refusée", "Un annonceur a refusé votre proposition.");
        void loadPage(ownerIdRef.current!, myTypesRef.current, pageRef.current);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ownerId, loadPage]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <Link to="/proprietaire" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Briefs ouverts</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {myTypes.length === 0
            ? "Faites approuver au moins un véhicule pour voir des briefs compatibles."
            : `Briefs compatibles avec vos véhicules approuvés (${myTypes.join(", ")}).`}
        </p>

        {pageLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground animate-pulse">
            Chargement…
          </div>
        ) : briefs.length === 0 ? (
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

        {total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => { userChangedPage.current = true; setPage((p) => Math.max(0, p - 1)); }}
              disabled={page === 0 || pageLoading}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            <span className="text-muted-foreground">
              Page {page + 1} / {totalPages} · {total} brief{total > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => { userChangedPage.current = true; setPage((p) => Math.min(totalPages - 1, p + 1)); }}
              disabled={page >= totalPages - 1 || pageLoading}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
