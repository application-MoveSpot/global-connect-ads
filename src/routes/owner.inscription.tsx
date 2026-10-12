import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateOwnerInscriptionSuggestion } from "@/lib/ai/owner-inscription-assistant.functions";
import { isValidPhone, normalizePhoneForMarket } from "@/lib/phone";
import { useMarket } from "@/lib/market";
import { track } from "@/lib/analytics/track";
import { LogoLink } from "@/components/app/LogoLink";
import { HoneypotField } from "@/components/app/HoneypotField";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/owner/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription propriétaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InscriptionPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function InscriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [market] = useMarket();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [siret, setSiret] = useState<SiretCheck>({
    siret: "",
    denomination: null,
    verified: false,
  });
  const [isParticulier, setIsParticulier] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const callOwnerAi = useServerFn(generateOwnerInscriptionSuggestion);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("owner_profiles")
          .select("id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) {
          navigate({ to: "/owner" });
        } else {
          setSessionEmail(data.session.user.email ?? null);
          setStep("profile");
        }
      }
    })();
  }, [navigate]);

  const handleOwnerAiGenerate = async () => {
    setAiError("");
    setAiLoading(true);
    setAiSessionExpired(false);
    try {
      const res = await callOwnerAi({ data: { ownerContext: aiContext } });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") { setAiSessionExpired(true); return; }
        setAiError(res.message);
        return;
      }
      const filled: string[] = [];
      if (res.suggestion.fullName) { setFullName(res.suggestion.fullName); filled.push(t("owner.inscription.name_label").replace(" *", "")); }
      if (res.suggestion.city) { setCity(res.suggestion.city); filled.push(t("owner.inscription.city_label")); }
      if (res.suggestion.bio) { setBio(res.suggestion.bio); filled.push(t("owner.inscription.bio_label")); }
      setAiFilled(filled);
      if (filled.length > 0) setAiPanelOpen(false);
    } catch {
      setAiError(t("owner.inscription.ai_generate_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setStep("auth");
    setMode("signup");
    setError("");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (honeypot) {
      setLoading(false);
      return;
    }
    if (mode === "signup") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/owner/inscription` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (
        signUpData.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
        setMode("signin");
        setError(t("owner.inscription.error_email_exists"));
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setMode("signin");
        setError(t("owner.inscription.error_confirm_email"));
        setLoading(false);
        return;
      }
      setSessionEmail(signUpData.session.user.email ?? null);
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSessionEmail(signInData.session?.user.email ?? null);
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isParticulier && !siret.verified) {
      setError(t("owner.inscription.error_siret"));
      return;
    }
    if (phone && !isValidPhone(phone, market)) {
      setError(t(market === "US" ? "common.phone_invalid_us" : "common.phone_invalid"));
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError(t("owner.inscription.error_session"));
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("owner_profiles").upsert({
      user_id: sess.session.user.id,
      full_name: fullName,
      phone: phone ? (normalizePhoneForMarket(phone, market) ?? null) : null,
      company: isParticulier
        ? null
        : company || siret.denomination,
      city: city || null,
      bio: bio || null,
      siret: isParticulier ? null : siret.siret || null,
      siret_denomination: isParticulier ? null : siret.denomination,
      siret_verified_at: isParticulier ? null : new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    void track("signup_completed", { role: "owner" });
    navigate({ to: "/owner/vehicules/nouveau" });
  };

  const steps = [
    t("owner.inscription.step_account"),
    t("owner.inscription.step_profile"),
    t("owner.inscription.step_vehicle"),
  ];
  const currentStep = step === "auth" ? 0 : 1;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/commencer"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("owner.inscription.back")}
        </Link>

        {/* Step progress indicator */}
        <div className="flex items-center gap-0 mt-5 mb-6">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    i < currentStep
                      ? "bg-primary text-primary-foreground"
                      : i === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${i === currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 transition ${i < currentStep ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? t("owner.inscription.title_signup") : t("owner.inscription.title_signin")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? t("owner.inscription.desc_signup")
                : t("owner.inscription.desc_signin")}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              <Input label={t("auth.email")} type="email" value={email} onChange={setEmail} required />
              <div>
                <Input
                  label={t("auth.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                />
                {mode === "signin" && (
                  <div className="mt-2 text-right">
                    <Link
                      to="/reset-password"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {t("auth.forgot_password")}
                    </Link>
                  </div>
                )}
              </div>
              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : mode === "signup" ? t("auth.submit_signup") : t("auth.submit_signin")}
              </button>
            </form>
            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === "signup"
                ? t("auth.switch_to_signin")
                : t("owner.inscription.switch_to_signup")}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">{t("owner.inscription.profile_title")}</h1>
            {sessionEmail && (
              <div className="mb-4 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                {t("owner.inscription.signed_in_as")}{" "}
                <strong className="text-foreground">{sessionEmail}</strong> —{" "}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="underline hover:text-foreground"
                >
                  {t("owner.inscription.sign_out_link")}
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              {t("owner.inscription.profile_desc")}
            </p>
            {/* Toggle particulier / professionnel */}
            <div className="flex rounded-lg border border-border overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => { setIsParticulier(true); setSiret({ siret: "", denomination: null, verified: false }); setCompany(""); }}
                className={`flex-1 py-2.5 text-sm font-medium transition ${isParticulier ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {t("owner.inscription.tab_particulier")}
              </button>
              <button
                type="button"
                onClick={() => setIsParticulier(false)}
                className={`flex-1 py-2.5 text-sm font-medium transition ${!isParticulier ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {t("owner.inscription.tab_professionnel")}
              </button>
            </div>
            <AiAssistantPanel
              variant="inline"
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              title={t("owner.inscription.ai_panel_title")}
              description={t("owner.inscription.ai_panel_desc")}
              placeholder={t("owner.inscription.ai_placeholder")}
              context={aiContext}
              onContextChange={setAiContext}
              onGenerate={handleOwnerAiGenerate}
              loading={aiLoading}
              error={aiError}
              sessionExpired={aiSessionExpired}
              sessionExpiredHref="/owner/inscription?mode=signin"
              generateLabel={t("owner.inscription.ai_generate")}
              generateLoadingLabel={t("owner.inscription.ai_generating")}
              filledMessage={aiFilled.length > 0 ? t("owner.inscription.ai_filled", { fields: aiFilled.join(", ") }) : undefined}
            />
            <form onSubmit={handleProfile} className="space-y-4">
              <Input label={t("owner.inscription.name_label")} value={fullName} onChange={setFullName} required />
              {!isParticulier && (
                <>
                  <SiretField value={siret} onChange={setSiret} />
                  {/* Nom commercial uniquement pour les sociétés (pas les EI) */}
                  {siret.verified && !siret.isIndividual && (
                    <Input label={t("owner.inscription.company_label")} value={company} onChange={setCompany} />
                  )}
                </>
              )}
              <Input label={t("owner.inscription.phone_label")} value={phone} onChange={setPhone} type="tel" placeholder={market === "US" ? "(555) 123-4567" : "06 12 34 56 78"} />
              <Input label={t("owner.inscription.city_label")} value={city} onChange={setCity} />
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("owner.inscription.bio_label")}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : t("owner.inscription.submit_continue")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
      {msg}
    </div>
  );
}
