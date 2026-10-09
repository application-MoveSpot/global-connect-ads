import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "movespot_annonceur_onboarded_v1";

type Props = {
  isIndividual?: boolean;
};

export function OnboardingModal({ isIndividual = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = [
    {
      icon: "🎯",
      title: t("onboarding.step1_title"),
      desc: t("onboarding.step1_desc"),
    },
    {
      icon: "🤝",
      title: t("onboarding.step2_title"),
      desc: t("onboarding.step2_desc"),
    },
    {
      icon: "🖼️",
      title: t("onboarding.step3_title"),
      desc: t("onboarding.step3_desc"),
    },
    {
      icon: "📍",
      title: t("onboarding.step4_title"),
      desc: t("onboarding.step4_desc"),
    },
  ];

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8 pt-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              {t("onboarding.welcome")}
            </span>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
              aria-label={t("onboarding.aria_close")}
            >
              ×
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{current?.icon}</div>
            <h2 className="font-display text-xl font-bold mb-2">{current?.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current?.desc}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-6" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-secondary transition"
              >
                {t("onboarding.btn_prev")}
              </button>
            )}
            {isLast ? (
              <div className="flex flex-col gap-2 flex-1">
                <Link
                  to={isIndividual ? "/advertiser/pack" : "/providers"}
                  onClick={dismiss}
                  className="block text-center rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
                >
                  {isIndividual ? t("onboarding.btn_discover_packs") : t("onboarding.btn_create_campaign")}
                </Link>
                <button
                  onClick={dismiss}
                  className="text-xs text-muted-foreground hover:text-foreground text-center py-1"
                >
                  {t("onboarding.btn_skip")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
              >
                {t("onboarding.btn_next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
