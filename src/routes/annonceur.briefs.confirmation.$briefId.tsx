import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { CheckCircle, Clock, Star, Zap } from "lucide-react";

export const Route = createFileRoute("/annonceur/briefs/confirmation/$briefId")({
  head: () => ({
    meta: [
      { title: "Annonce publiée — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ConfirmationPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ConfirmationPage() {
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<{
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    zones?: string[] | null;
  } | null>(null);
  const [isIndividual, setIsIndividual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const [briefRes, profileRes] = await Promise.allSettled([
        supabase
          .from("advertiser_briefs")
          .select("title, start_date, end_date, zones")
          .eq("id", briefId)
          .maybeSingle(),
        supabase
          .from("advertiser_profiles")
          .select("account_type")
          .eq("user_id", sess.session.user.id)
          .maybeSingle(),
      ]);
      if (briefRes.status === "fulfilled") {
        setBrief(briefRes.value.data as typeof brief);
      }
      if (profileRes.status === "fulfilled") {
        const p = profileRes.value.data as { account_type?: string } | null;
        setIsIndividual(p?.account_type === "individual");
      }
      setLoading(false);
    })();
  }, [briefId, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  const days = daysUntil(brief?.start_date);
  const urgent = days !== null && days >= 0 && days <= 7;
  const zoneLabel = brief?.zones?.length ? brief.zones[0] : null;

  if (isIndividual) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <LogoLink />
            <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          {/* Header succès */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-4xl mb-3">🎉</div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Votre annonce est en ligne !
            </h1>
            <p className="text-muted-foreground">
              Les propriétaires de véhicules vont pouvoir la voir et vous envoyer des propositions.
            </p>
          </div>

          {/* Urgence */}
          {urgent && days !== null && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 mb-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Votre événement est dans {days === 0 ? "moins d'1 jour" : `${days} jour${days > 1 ? "s" : ""}`}.</strong>{" "}
                Répondez aux propositions rapidement pour sécuriser votre véhicule à temps.
              </div>
            </div>
          )}

          {/* Résumé brief */}
          <div className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
            <h2 className="font-display font-bold text-lg mb-1">Récapitulatif de votre annonce</h2>
            {brief?.title && <Row label="Titre" value={brief.title} />}
            {brief?.start_date && <Row label="Date de début" value={fmtDate(brief.start_date)!} />}
            {brief?.end_date && <Row label="Date de fin" value={fmtDate(brief.end_date)!} />}
            {zoneLabel && <Row label="Zone de diffusion" value={zoneLabel} />}
          </div>

          {/* Étapes suivantes */}
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="font-display font-bold text-lg mb-4">Ce qui va se passer</h2>
            <ol className="space-y-4">
              {[
                { icon: "📬", step: "Les propriétaires de véhicules reçoivent votre annonce et peuvent vous envoyer une proposition avec leur tarif." },
                { icon: "👀", step: "Vous recevez un email dès qu'une proposition arrive. Vous pouvez en comparer plusieurs." },
                { icon: "✅", step: "Vous choisissez le véhicule qui vous convient — un seul clic pour confirmer." },
                { icon: "🚗", step: "Votre publicité est affichée sur le véhicule pour votre événement." },
              ].map(({ icon, step }, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-base">{icon}</span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Conseil */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-8 flex items-start gap-3">
            <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Conseil :</strong> Ajoutez votre visuel dès maintenant — les propriétaires acceptent en priorité les annonces avec un visuel prêt.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/annonceur/briefs/$briefId"
              params={{ briefId }}
              className="flex-1 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold text-center hover:bg-primary/90 transition"
            >
              Voir mon annonce →
            </Link>
            <Link
              to="/annonceur"
              className="flex-1 rounded-full border border-border bg-card px-6 py-3 font-semibold text-center hover:bg-secondary transition"
            >
              Mon espace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Version entreprise
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-6">
          <Zap className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-3">Brief publié avec succès</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Votre brief est maintenant visible par les propriétaires de flotte. Vous recevrez leurs propositions directement dans votre espace annonceur.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left space-y-3">
          {brief?.title && <Row label="Nom du brief" value={brief.title} />}
          {brief?.start_date && <Row label="Début" value={fmtDate(brief.start_date)!} />}
          {brief?.end_date && <Row label="Fin" value={fmtDate(brief.end_date)!} />}
          {zoneLabel && <Row label="Zone" value={zoneLabel} />}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/annonceur/briefs/$briefId"
            params={{ briefId }}
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition"
          >
            Voir le brief →
          </Link>
          <Link
            to="/annonceur"
            className="rounded-full border border-border bg-card px-6 py-3 font-semibold hover:bg-secondary transition"
          >
            Tableau de bord
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
