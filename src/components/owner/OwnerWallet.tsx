/**
 * OwnerWallet
 *
 * Tableau de bord financier du propriétaire :
 *  - Solde disponible
 *  - Historique des transactions (gains, pénalités, virements)
 *  - Configuration Stripe Connect (onboarding ou badge "Compte lié")
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as any;

interface WalletRow {
  id: string;
  owner_id: string;
  stripe_connect_id: string | null;
  balance_ht: number;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: "payout" | "earnings" | "penalty";
  status: "pending" | "completed" | "failed";
  reference_id: string | null;
  description: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TYPE_CONFIG = {
  earnings: {
    label: "Gain campagne",
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200",
  },
  penalty: {
    label: "Pénalité propreté",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 text-red-700 border-red-200",
  },
  payout: {
    label: "Virement bancaire",
    icon: ArrowDownToLine,
    color: "text-primary",
    bg: "bg-primary/10 text-primary border-primary/20",
  },
} as const;

const STATUS_CONFIG = {
  pending:   { label: "En attente", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Complété",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed:    { label: "Échoué",     cls: "bg-red-100 text-red-700 border-red-200" },
} as const;

export function OwnerWallet() {
  const [connectLoading, setConnectLoading] = useState(false);

  // ── Wallet ────────────────────────────────────────────────────────────────
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery<WalletRow | null>({
    queryKey: ["owner-wallet"],
    queryFn: async () => {
      const { data, error } = await db
        .from("owner_wallets")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 60_000,
  });

  // ── Transactions ──────────────────────────────────────────────────────────
  const { data: transactions, isLoading: txLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["owner-wallet-transactions", wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const { data, error } = await db
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
    enabled: !!wallet?.id,
    staleTime: 60_000,
  });

  // ── Stripe Connect onboarding ─────────────────────────────────────────────
  const handleConfigureStripe = async () => {
    setConnectLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-onboarding-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur Stripe");
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      console.error("Stripe connect error:", err);
      toast.error("Impossible de générer le lien Stripe. Réessayez.");
    } finally {
      setConnectLoading(false);
    }
  };

  const isLoading = walletLoading || txLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Chargement du portefeuille…</span>
      </div>
    );
  }

  const balance = wallet?.balance_ht ?? 0;
  const isStripeLinked = !!wallet?.stripe_connect_id;
  const totalEarnings = (transactions ?? [])
    .filter((t) => t.type === "earnings" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);
  const totalPenalties = (transactions ?? [])
    .filter((t) => t.type === "penalty" && t.status === "completed")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Solde disponible
            </p>
            <p className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Total gains
            </p>
            <p className="font-display text-2xl font-bold text-foreground">
              {fmtCurrency(totalEarnings)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/10 bg-red-500/5">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Pénalités déduites
            </p>
            <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
              {fmtCurrency(totalPenalties)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Stripe Connect ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Virements bancaires</CardTitle>
          </div>
          <CardDescription>
            Configurez votre compte Stripe Connect pour recevoir vos gains directement sur votre
            compte bancaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStripeLinked ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Compte Stripe lié</p>
                <p className="text-xs text-muted-foreground">
                  Vos gains sont virés automatiquement à la fin de chaque campagne.
                </p>
              </div>
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                Configuré
              </Badge>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Sans compte Stripe, vos gains sont crédités sur votre portefeuille MoveSpot mais
                  ne peuvent pas être virés sur votre banque.
                </p>
              </div>
              <Button
                onClick={handleConfigureStripe}
                disabled={connectLoading}
                className="shrink-0 gap-2"
              >
                {connectLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Configurer mes virements
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Historique des transactions ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique des transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Aucune transaction pour le moment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vos gains apparaîtront ici à la fin de chaque campagne.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile : cards */}
              <div className="flex flex-col gap-3 p-4 md:hidden">
                {transactions.map((tx) => {
                  const typeCfg = TYPE_CONFIG[tx.type];
                  const statusCfg = STATUS_CONFIG[tx.status];
                  const Icon = typeCfg.icon;
                  const isNeg = tx.amount < 0;
                  return (
                    <div key={tx.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                            <Icon className={`h-4 w-4 ${typeCfg.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{typeCfg.label}</p>
                            {tx.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`font-bold text-sm tabular-nums ${isNeg ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {isNeg ? "" : "+"}
                          {fmtCurrency(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{fmtDate(tx.created_at)}</span>
                        <div className="flex gap-1.5">
                          <Badge variant="secondary" className={`text-[10px] border ${typeCfg.bg}`}>
                            {typeCfg.label}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] border ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop : table */}
              <div className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Montant</TableHead>
                      <TableHead className="text-xs text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const typeCfg = TYPE_CONFIG[tx.type];
                      const statusCfg = STATUS_CONFIG[tx.status];
                      const Icon = typeCfg.icon;
                      const isNeg = tx.amount < 0;
                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {fmtDate(tx.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${typeCfg.color} shrink-0`} />
                              <Badge
                                variant="secondary"
                                className={`text-[10px] border ${typeCfg.bg}`}
                              >
                                {typeCfg.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                            {tx.description ?? "—"}
                          </TableCell>
                          <TableCell
                            className={`text-sm text-right tabular-nums font-semibold ${isNeg ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}
                          >
                            {isNeg ? "" : "+"}
                            {fmtCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] border ${statusCfg.cls}`}
                            >
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Les gains sont calculés automatiquement à la fin de chaque campagne, après déduction des
        éventuelles pénalités. Les virements bancaires nécessitent un compte Stripe Connect configuré.
      </p>
    </div>
  );
}
