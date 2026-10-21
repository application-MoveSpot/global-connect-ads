import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/advertiser/avis/$campaignId")({
  head: () => ({
    meta: [
      { title: "Laisser un avis — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AvisPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Campaign = {
  id: string;
  spot_name: string;
  vehicle_id: string | null;
  status: string;
};

function AvisPage() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data: camp } = await supabase
        .from("campaign_requests")
        .select("id, spot_name, vehicle_id, status")
        .eq("id", campaignId)
        .eq("user_id", uid)
        .maybeSingle();

      if (!camp) {
        navigate({ to: "/advertiser" });
        return;
      }
      setCampaign(camp as Campaign);

      // Get owner_id from vehicle
      if (camp.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("owner_id")
          .eq("id", camp.vehicle_id)
          .maybeSingle();
        if (v) setOwnerId(v.owner_id);
      }

      // Check if already reviewed
      const { data: existing } = await supabase
        .from("owner_reviews")
        .select("id")
        .eq("campaign_request_id", campaignId)
        .maybeSingle();
      if (existing) setAlreadyReviewed(true);
    })();
  }, [campaignId, navigate]);

  const submit = async () => {
    if (rating === 0 || !userId || !ownerId) return;
    setSubmitting(true);
    const { error } = await supabase.from("owner_reviews").insert({
      campaign_request_id: campaignId,
      advertiser_id: userId,
      owner_id: ownerId,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      toast.error("Erreur lors de l'envoi de votre avis. Réessayez.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (alreadyReviewed || submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-xl mx-auto px-4 py-4">
            <LogoLink />
          </div>
        </header>
        <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="text-5xl">{submitted ? "🎉" : "✅"}</div>
          <h1 className="font-display text-2xl font-bold">
            {submitted ? "Merci pour votre avis !" : "Avis déjà soumis"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {submitted
              ? "Votre retour aide la communauté MoveSpot à choisir les meilleurs propriétaires."
              : "Vous avez déjà laissé un avis pour cette campagne."}
          </p>
          <Link
            to="/advertiser"
            className="inline-block rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
          >
            Retour à mes campagnes
          </Link>
        </main>
      </div>
    );
  }

  const LABELS = ["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/advertiser"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Retour
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Évaluez ce propriétaire</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Campagne : <strong>{campaign.spot_name}</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {/* Star rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Note globale</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="p-1 transition"
                  aria-label={`${s} étoile${s > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      s <= (hover || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-none text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hover || rating) > 0 && (
              <p className="text-sm text-muted-foreground">{LABELS[hover || rating]}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label htmlFor="comment" className="text-sm font-medium">
              Commentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez votre expérience avec ce propriétaire…"
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
          </div>

          <button
            onClick={() => void submit()}
            disabled={rating === 0 || submitting}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {submitting ? "Envoi en cours…" : "Publier mon avis"}
          </button>
        </div>
      </main>
    </div>
  );
}
