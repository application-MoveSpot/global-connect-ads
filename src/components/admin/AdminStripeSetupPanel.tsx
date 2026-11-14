import { useState } from "react";
import { toast } from "sonner";
import { Zap, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type SetupResult = {
  name: string;
  lookupKey?: string;
  status: "créé" | "déjà existant" | "erreur";
  priceId?: string;
  amount?: string;
  error?: string;
};

type SetupResponse = {
  ok: boolean;
  environment?: string;
  results?: SetupResult[];
  error?: string;
  hint?: string;
};

export function AdminStripeSetupPanel() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SetupResponse | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Session expirée — reconnectez-vous.");
        return;
      }

      const res = await fetch("/api/admin/setup-stripe-products", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: SetupResponse = await res.json();
      setResponse(json);
      if (res.ok && json.ok) {
        const created = json.results?.filter((r) => r.status === "créé").length ?? 0;
        toast.success(`Setup OK (${json.environment}) — ${created} produit(s) créé(s).`);
      } else {
        toast.error(json.error ?? "Erreur inattendue");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      toast.error(msg);
      setResponse({ ok: false, error: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Initialiser les produits Stripe Live
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Crée les produits Stripe manquants (prestataires 29/42/59 €, partenaire 149 €).
            Idempotent — aucun doublon si les lookup_keys existent déjà.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSetup}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />En cours…</>
          ) : (
            "Lancer le setup"
          )}
        </Button>
      </div>

      {response && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          {response.error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {response.error}
              {response.hint && <span className="text-muted-foreground"> — {response.hint}</span>}
            </p>
          )}
          {response.results?.map((r) => (
            <div key={r.lookupKey ?? r.name} className="flex items-start gap-2 text-xs">
              {r.status === "créé" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              ) : r.status === "erreur" ? (
                <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <span>
                <span className="font-medium">{r.lookupKey ?? r.name}</span>
                {r.amount && <span className="text-muted-foreground"> · {r.amount}</span>}
                {r.status === "déjà existant" && (
                  <span className="text-muted-foreground"> · déjà existant</span>
                )}
                {r.status === "erreur" && (
                  <span className="text-destructive"> · {r.error}</span>
                )}
                {r.priceId && (
                  <span className="text-muted-foreground font-mono"> {r.priceId}</span>
                )}
              </span>
            </div>
          ))}
          {response.environment && (
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Environnement : <span className="font-semibold">{response.environment}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
