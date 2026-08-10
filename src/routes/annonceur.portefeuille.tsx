import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { getMyWallet } from "@/lib/wallet.functions";
import { WalletTopupCheckout } from "@/components/WalletTopupCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/annonceur/portefeuille")({
  head: () => ({
    meta: [
      { title: "Mon portefeuille — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WalletPage,
});

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function WalletPage() {
  const navigate = useNavigate();
  const fetchWallet = useServerFn(getMyWallet);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance_cents: number; transactions: any[] } | null>(null);
  const [amount, setAmount] = useState<number>(100);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      try {
        const w = await fetchWallet();
        setWallet({ balance_cents: w.balance_cents, transactions: w.transactions });
      } catch {
        setWallet({ balance_cents: 0, transactions: [] });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="font-display text-3xl font-bold mb-2">Mon portefeuille</h1>
          <p className="text-sm text-muted-foreground">Crédits prépayés utilisables instantanément pour vos campagnes.</p>
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Solde disponible</div>
          <div className="font-display text-5xl font-bold mt-2">{fmt(wallet?.balance_cents ?? 0)}</div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Recharger par carte bancaire</h2>
          <p className="text-sm text-muted-foreground">Paiement sécurisé via Stripe. Le solde est crédité instantanément.</p>
          <div className="flex flex-wrap items-center gap-2">
            {[50, 100, 250, 500, 1000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${amount === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
              >
                {v} €
              </button>
            ))}
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
              className="w-28 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <WalletTopupCheckout
            amountEuros={amount}
            buttonLabel={`Recharger ${amount} €`}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <BankTransferPanel />
        </section>


        <section>
          <h2 className="font-display text-xl font-semibold mb-3">Historique du portefeuille</h2>
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
