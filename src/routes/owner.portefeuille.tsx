import { createFileRoute, useSearch } from "@tanstack/react-router";
import { RouteError } from "@/components/app/RouteError";
import { AppHeader } from "@/components/app/AppHeader";
import { OwnerWallet } from "@/components/owner/OwnerWallet";
import { OwnerBankTransfersList } from "@/components/owner/OwnerBankTransfersList";
import { Wallet } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/owner/portefeuille")({
  head: () => ({
    meta: [
      { title: "Mon portefeuille — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    connect: (search.connect as "success" | "refresh" | undefined) ?? undefined,
  }),
  component: PortefeuillePage,
  errorComponent: RouteError,
});

function PortefeuillePage() {
  const { connect } = useSearch({ from: "/owner/portefeuille" });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (connect === "success") {
      queryClient.invalidateQueries({ queryKey: ["owner-wallet"] });
      toast.success("Compte Stripe Connect configuré avec succès !");
    } else if (connect === "refresh") {
      toast.info("Lien expiré. Veuillez recommencer la configuration Stripe.");
    }
  }, [connect, queryClient]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Mon portefeuille</h1>
            <p className="text-sm text-muted-foreground">
              Gains, ajustements et virements bancaires via Stripe Connect.
            </p>
          </div>
        </div>

        <OwnerWallet />
        <OwnerBankTransfersList />
      </main>
    </div>
  );
}
