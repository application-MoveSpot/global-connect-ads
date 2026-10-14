import { useTranslation } from "react-i18next";

type Props = {
  status: string;
  paymentStatus: string;
  installationStatus?: string | null;
  subscriptionStatus?: string | null;
};

type Step = { label: string; state: "done" | "active" | "error" | "pending" };

export function CampaignStepper({
  status,
  paymentStatus,
  installationStatus,
  subscriptionStatus,
}: Props) {
  const { t } = useTranslation();

  const steps: Step[] = [
    { label: t("stepper.submitted"), state: "done" },
    getValidationStep(status, t),
    getPaymentStep(status, paymentStatus, t),
    getInstallationStep(status, paymentStatus, installationStatus, t),
    getActiveStep(status, paymentStatus, subscriptionStatus, t),
  ];

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center shrink-0">
          <div className="flex flex-col items-center gap-1 min-w-[72px]">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dotClass(step.state)}`}
            >
              {step.state === "done" ? "✓" : step.state === "error" ? "✕" : i + 1}
            </div>
            <span className={`text-[10px] text-center leading-tight ${labelClass(step.state)}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-6 shrink-0 mb-4 ${steps[i + 1].state === "pending" ? "bg-border" : "bg-signal/50"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function getValidationStep(status: string, t: (k: string) => string): Step {
  if (status === "approved") return { label: t("stepper.validated"), state: "done" };
  if (status === "rejected") return { label: t("stepper.rejected"), state: "error" };
  return { label: t("stepper.validation"), state: "active" };
}

function getPaymentStep(status: string, paymentStatus: string, t: (k: string) => string): Step {
  if (status !== "approved") return { label: t("stepper.payment"), state: "pending" };
  if (paymentStatus === "paid") return { label: t("stepper.paid"), state: "done" };
  if (paymentStatus === "refunded" || paymentStatus === "partial_refund")
    return { label: t("stepper.refunded"), state: "error" };
  return { label: t("stepper.to_pay"), state: "active" };
}

function getInstallationStep(
  status: string,
  paymentStatus: string,
  installationStatus: string | null | undefined,
  t: (k: string) => string,
): Step {
  if (status !== "approved" || paymentStatus !== "paid")
    return { label: t("stepper.installation"), state: "pending" };
  if (installationStatus === "approved") return { label: t("stepper.installed"), state: "done" };
  if (installationStatus === "rejected")
    return { label: t("stepper.installation_rejected"), state: "error" };
  return { label: t("stepper.installing"), state: "active" };
}

function getActiveStep(
  status: string,
  paymentStatus: string,
  subscriptionStatus: string | null | undefined,
  t: (k: string) => string,
): Step {
  if (status !== "approved" || paymentStatus !== "paid")
    return { label: t("stepper.broadcasting"), state: "pending" };
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing")
    return { label: t("stepper.active"), state: "done" };
  if (subscriptionStatus === "canceled") return { label: t("stepper.ended"), state: "done" };
  if (subscriptionStatus === "past_due" || subscriptionStatus === "unpaid")
    return { label: t("stepper.broadcasting"), state: "error" };
  return { label: t("stepper.broadcasting"), state: "pending" };
}

function dotClass(state: Step["state"]) {
  if (state === "done") return "bg-signal text-white";
  if (state === "active") return "bg-primary text-primary-foreground ring-2 ring-primary/30";
  if (state === "error") return "bg-destructive text-white";
  return "bg-secondary text-muted-foreground";
}

function labelClass(state: Step["state"]) {
  if (state === "done") return "text-signal font-medium";
  if (state === "active") return "text-primary font-semibold";
  if (state === "error") return "text-destructive font-medium";
  return "text-muted-foreground";
}
