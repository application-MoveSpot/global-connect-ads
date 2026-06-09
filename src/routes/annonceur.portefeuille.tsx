import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { getMyWallet } from "@/lib/wallet.functions";
import { WalletTopupCheckout } from "@/components/WalletTopupCheckout";

type Search = { session_id?: string; topup?: string };

export const Route = createFileRoute("/annonceur/portefeuille")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    topup: typeof s.topup === "string" ? s.topup : undefined,
  }),
  component: WalletPage,
});

const PRESETS = [50, 100, 250, 500, 1000];

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function WalletPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/annonceur/portefeuille" });
  const fetchWallet = useServerFn(getMyWallet);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance_cents: number; transactions: any[] } | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [showCheckout, setShowCheckout] = useState<boolean>(search.topup === "1");

  const refresh = async () => {
    try {
      const w = await fetchWallet();
      setWallet({ balance_cents: w.balance_cents, transactions: w.transactions });
    } catch {
      setWallet({ balance_cents: 0, transactions: [] });
    }
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      await refresh();
      setLoading(false);
      // If returning from Stripe, refresh every 2s for ~20s until balance updates
      if (search.session_id) {
        const startBalance = (await fetchWallet()).balance_cents;
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const w = await fetchWallet();
          if (w.balance_cents !== startBalance) {
            setWallet({ balance_cents: w.balance_cents, transactions: w.transactions });
            break;
          }
        }
        navigate({ to: "/annonceur/portefeuille", replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  const returnUrl = `${window.location.origin}/annonceur/portefeuille?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="font-display text-3xl font-bold mb-2">Mon portefeuille</h1>
          <p className="text-sm text-muted-foreground">Crédits prépayés utilisables pour vos campagnes.</p>
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Solde disponible</div>
          <div className="font-display text-5xl font-bold mt-2">{fmt(wallet?.balance_cents ?? 0)}</div>
          <div className="mt-6 flex flex-wrap gap-2">
            {!showCheckout && (
              <button onClick={() => setShowCheckout(true)}
                className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90">
                + Recharger
              </button>
            )}
          </div>
        </section>

        {showCheckout && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Recharger mon portefeuille</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`px-4 py-2 rounded-full text-sm border ${amount === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
                  {p} €
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input type="number" min={10} max={5000} value={amount}
                  onChange={(e) => setAmount(Math.max(10, Math.min(5000, Number(e.target.value) || 0)))}
                  className="w-28 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
                <span className="text-sm">€</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Montant : 10 € minimum, 5 000 € maximum par recharge. Paiement sécurisé Stripe.</p>
            <WalletTopupCheckout amountEuros={amount} returnUrl={returnUrl} />
            <button onClick={() => setShowCheckout(false)}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl font-semibold mb-3">Historique</h2>
          {(!wallet?.transactions || wallet.transactions.length === 0) ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground text-sm">
              Aucun mouvement pour le moment.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3">{labelKind(t.kind)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.description ?? "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${t.amount_cents >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                        {t.amount_cents >= 0 ? "+" : ""}{fmt(t.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function labelKind(k: string) {
  switch (k) {
    case "topup": return "Recharge";
    case "campaign_debit": return "Campagne";
    case "refund": return "Remboursement";
    case "admin_adjustment": return "Ajustement";
    default: return k;
  }
}
