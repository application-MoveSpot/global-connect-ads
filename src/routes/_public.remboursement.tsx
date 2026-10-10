import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/_public/remboursement")({
  head: () => ({
    meta: [
      { title: "Politique de remboursement — MoveSpot" },
      { name: "description", content: "Conditions et procédure de remboursement MoveSpot pour les advertisers." },
    ],
  }),
  component: RemboursementPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function RemboursementPage() {
  const { t } = useTranslation();

  const eligibleCases = [0, 1, 2, 3];
  const nonEligibleCases = [0, 1, 2, 3, 4];
  const delays = [0, 1, 2];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div>
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">{t("refund.back")}</Link>
          <h1 className="font-display text-4xl font-bold mb-2">{t("refund.title")}</h1>
          <p className="text-muted-foreground">{t("refund.last_updated")}</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">{t("refund.general_title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("refund.general_text")}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-xl">{t("refund.eligible_title")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {eligibleCases.map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                <p className="font-semibold text-sm flex items-center gap-2"><span>✅</span>{t(`refund.eligible.${i}_title`)}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(`refund.eligible.${i}_desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-xl">{t("refund.non_eligible_title")}</h2>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-2">
            {nonEligibleCases.map((i) => (
              <p key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-destructive shrink-0">✕</span>{t(`refund.non_eligible.${i}`)}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">{t("refund.delays_title")}</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-center text-sm">
            {delays.map((i) => (
              <div key={i} className="rounded-xl bg-secondary/40 p-3">
                <p className="font-bold text-base">{t(`refund.delay.${i}_value`)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t(`refund.delay.${i}_label`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-xl">{t("refund.request_title")}</h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
              {t("refund.step1")}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
              {t("refund.step2_pre")}<strong className="text-foreground">{t("refund.step2_bold")}</strong>{t("refund.step2_post")}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
              {t("refund.step3")}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
              {t("refund.step4")}
            </li>
          </ol>
          <div className="pt-2">
            <Link
              to="/advertiser"
              className="inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
            >
              {t("refund.cta")}
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <h2 className="font-semibold text-xl">{t("refund.contact_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("refund.contact_text")}{" "}
            <a href="mailto:support@move-spot.com" className="text-primary underline">support@move-spot.com</a>
          </p>
        </section>
      </main>
    </div>
  );
}
