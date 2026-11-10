import { AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface StripeComplianceBannerProps {
  stripeConnectAccountId: string | null | undefined;
  payoutsEnabled: boolean;
  requirementsDue: string[];
}

export function StripeComplianceBanner({
  stripeConnectAccountId,
  payoutsEnabled,
  requirementsDue,
}: StripeComplianceBannerProps) {
  // On n'affiche rien si l'utilisateur n'a pas encore lié son compte Stripe Connect
  if (!stripeConnectAccountId || payoutsEnabled || requirementsDue.length === 0) return null;

  const isBlocked  = !payoutsEnabled;
  const hasPending = requirementsDue.length > 0;
  // Si on est ici : compte Stripe lié, payouts bloqués, et requirements > 0

  return (
    <div
      className={`w-full border-b px-4 py-3 ${
        isBlocked
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
      }`}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold">
            {isBlocked
              ? "Virements Stripe bloqués — action requise"
              : "Informations Stripe incomplètes"}
          </p>
          {hasPending && (
            <ul className="text-xs space-y-0.5 opacity-80">
              {requirementsDue.map((req) => (
                <li key={req} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          to="/owner/profil"
          className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition shrink-0"
        >
          Compléter mon profil Stripe
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
