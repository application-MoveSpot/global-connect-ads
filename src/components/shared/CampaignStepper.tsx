type Props = {
  status: string;
  paymentStatus: string;
  installationStatus?: string | null;
  subscriptionStatus?: string | null;
};

type Step = { label: string; state: "done" | "active" | "error" | "pending" };

export function CampaignStepper({ status, paymentStatus, installationStatus, subscriptionStatus }: Props) {
  const steps: Step[] = [
    { label: "Soumise", state: "done" },
    getValidationStep(status),
    getPaymentStep(status, paymentStatus),
    getInstallationStep(status, paymentStatus, installationStatus),
    getActiveStep(status, paymentStatus, subscriptionStatus),
  ];

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center shrink-0">
          <div className="flex flex-col items-center gap-1 min-w-[72px]">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dotClass(step.state)}`}>
              {step.state === "done" ? "✓" : step.state === "error" ? "✕" : i + 1}
            </div>
            <span className={`text-[10px] text-center leading-tight ${labelClass(step.state)}`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 shrink-0 mb-4 ${steps[i + 1].state === "pending" ? "bg-border" : "bg-signal/50"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function getValidationStep(status: string): Step {
  if (status === "approved") return { label: "Validée", state: "done" };
  if (status === "rejected") return { label: "Refusée", state: "error" };
  return { label: "Validation", state: "active" };
}

function getPaymentStep(status: string, paymentStatus: string): Step {
  if (status !== "approved") return { label: "Paiement", state: "pending" };
  if (paymentStatus === "paid") return { label: "Payée", state: "done" };
  if (paymentStatus === "refunded" || paymentStatus === "partial_refund") return { label: "Remboursée", state: "error" };
  return { label: "À payer", state: "active" };
}

function getInstallationStep(status: string, paymentStatus: string, installationStatus?: string | null): Step {
  if (status !== "approved" || paymentStatus !== "paid") return { label: "Installation", state: "pending" };
  if (installationStatus === "approved") return { label: "Posée", state: "done" };
  if (installationStatus === "rejected") return { label: "Pose refusée", state: "error" };
  return { label: "En pose", state: "active" };
}

function getActiveStep(status: string, paymentStatus: string, subscriptionStatus?: string | null): Step {
  if (status !== "approved" || paymentStatus !== "paid") return { label: "En diffusion", state: "pending" };
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") return { label: "Active", state: "done" };
  if (subscriptionStatus === "canceled") return { label: "Terminée", state: "done" };
  if (subscriptionStatus === "past_due" || subscriptionStatus === "unpaid") return { label: "En diffusion", state: "error" };
  return { label: "En diffusion", state: "pending" };
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
