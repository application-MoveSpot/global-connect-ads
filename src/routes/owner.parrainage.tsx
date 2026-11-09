import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { RouteError } from "@/components/app/RouteError";
import { AppHeader } from "@/components/app/AppHeader";
import { OwnerReferral } from "@/components/owner/OwnerReferral";

export const Route = createFileRoute("/owner/parrainage")({
  head: () => ({
    meta: [
      { title: "Parrainage — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParrainagePage,
  errorComponent: RouteError,
});

function ParrainagePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
            <Gift className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">{t("owner.referral.page_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("owner.referral.page_desc")}</p>
          </div>
        </div>

        <OwnerReferral />
      </main>
    </div>
  );
}
