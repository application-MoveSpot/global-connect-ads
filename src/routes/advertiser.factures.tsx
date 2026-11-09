import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/app/RouteError";
import { AppHeader } from "@/components/app/AppHeader";
import { AdvertiserBilling } from "@/components/advertiser/AdvertiserBilling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptText } from "lucide-react";

export const Route = createFileRoute("/advertiser/factures")({
  head: () => ({
    meta: [
      { title: "Mes factures — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FacturesPage,
  errorComponent: RouteError,
});

function FacturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ReceiptText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Mes factures</h1>
            <p className="text-sm text-muted-foreground">
              Toutes vos factures PDF générées automatiquement à l&apos;activation d&apos;une campagne.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique de facturation</CardTitle>
          </CardHeader>
          <CardContent>
            <AdvertiserBilling />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
