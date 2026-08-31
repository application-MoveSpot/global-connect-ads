import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { CampaignPackCheckout } from "@/components/advertiser/CampaignPackCheckout";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/annonceur/pack")({
  head: () => ({
    meta: [
      { title: "Pack publicitaire sans abonnement — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PackPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function PackPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/annonceur/inscription", search: { redirect: "/annonceur/pack" } });
        return;
      }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("account_type")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      setAccountType((prof as { account_type?: string } | null)?.account_type ?? "business");
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  const isIndividual = accountType === "individual";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">
            ← Mon espace
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            {isIndividual ? "Packs événement" : "Pack publicitaire"}
          </h1>
          <p className="text-muted-foreground">
            {isIndividual
              ? "Choisissez le pack adapté à votre événement. Paiement unique, aucun abonnement."
              : "Lancez une campagne sans abonnement. Payez une fois, diffusez immédiatement."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold text-lg mb-1">Comment ça marche ?</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-none">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">1</span>
              {isIndividual
                ? "Choisissez le pack correspondant à votre type d'événement et payez par carte"
                : "Choisissez votre pack ci-dessous et payez par carte"}
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">2</span>
              Le montant est crédité sur votre portefeuille MoveSpot
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">3</span>
              {isIndividual
                ? "Publiez votre brief — quand un propriétaire accepte, le portefeuille se débite automatiquement"
                : "Créez un brief ou acceptez une proposition — le portefeuille se débite automatiquement"}
            </li>
          </ol>
        </div>

        <CampaignPackCheckout
          accountType={accountType}
          returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/annonceur?pack=success`}
        />

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Vous préférez un abonnement mensuel avec 14 jours d'essai gratuit ?
          </p>
          <Link
            to="/annonceur/briefs"
            className="text-sm text-primary hover:underline"
          >
            Créer un brief et activer l'essai →
          </Link>
        </div>
      </main>
    </div>
  );
}
