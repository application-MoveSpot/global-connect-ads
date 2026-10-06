import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { getConsent, setConsent as persistConsent } from "@/lib/consent";
import { resetStripeCache } from "@/lib/payments/stripe";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Affiche le banner si absent ou si le consentement a expiré (> 6 mois)
    if (getConsent() === null) setVisible(true);
  }, []);

  const save = (choice: "accepted" | "refused") => {
    persistConsent(choice); // stocke {v, ts} + dispatch "ms-consent-change"
    resetStripeCache();     // permet à Stripe de se charger si le choix est "accepted"
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg"
    >
      <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous utilisons des cookies essentiels au fonctionnement du site (Mapbox, Stripe). En
            continuant, vous acceptez leur dépôt.{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              En savoir plus
            </Link>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => save("refused")}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Refuser
            </button>
            <button
              onClick={() => save("accepted")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Accepter
            </button>
            <button
              onClick={() => save("refused")}
              aria-label="Fermer"
              className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
