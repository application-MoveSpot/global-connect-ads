import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { track } from "@/lib/analytics/track";
import { LogoLink } from "@/components/app/LogoLink";
import { HoneypotField } from "@/components/app/HoneypotField";
import { generatePartnerSuggestion } from "@/lib/ai/partner-assistant.functions";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/partner/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription partner — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerSignupPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function PartnerSignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const callPartnerAi = useServerFn(generatePartnerSuggestion);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (session) {
        const { data: existing } = await supabase
          .from("partner_profiles")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/partner" });
        else {
          setEmail(session.user.email ?? "");
          setSessionEmail(session.user.email ?? null);
          setStep("profile");
        }
      }
    })();
  }, [navigate]);

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
        options: { emailRedirectTo: `${window.location.origin}/partner/inscription` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (signUpData.user?.identities?.length === 0) {
        setMode("signin");
        setError(t("auth.error.email_exists"));
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setMode("signin");
        setError(t("auth.check_email"));
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

  const handlePartnerAiGenerate = async () => {
    setAiError("");
    setAiSessionExpired(false);
    if (aiContext.trim().length < 10) {
      setAiError("Décrivez votre activité en au moins 10 caractères.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await callPartnerAi({ data: { partnerContext: aiContext.trim() } });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") { setAiSessionExpired(true); return; }
        setAiError(res.message);
        return;
      }
      setDescription(res.suggestion.description);
      setAiFilled(true);
      setAiPanelOpen(false);
    } catch {
      setAiError("Une erreur inattendue est survenue. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (company.trim().length < 2) {
      setError(t("auth.invalid_company"));
      return;
    }
    const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/;
    if (!nameRe.test(fullName.trim())) {
      setError(t("auth.invalid_name"));
      return;
    }
    if (description.trim().length < 30) {
      setError(t("partner.inscription.error.short_description"));
      return;
    }
    const phoneTrim = phone.trim();
    if (phoneTrim && !/^[+\d][\d\s().-]{7,19}$/.test(phoneTrim)) {
      setError(t("auth.invalid_phone"));
      return;
    }
    const websiteTrim = website.trim();
    let websiteValue: string | null = null;
    if (websiteTrim) {
      try {
        const u = new URL(websiteTrim);
        if (u.protocol !== "https:") {
          setError(t("auth.https_required"));
          return;
        }
        websiteValue = u.toString();
      } catch {
        setError(t("auth.invalid_url"));
        return;
      }
    }
    setLoading(true);
    const session = await getOrRefreshSession();
    if (!session) {
      setError(t("auth.session_expired"));
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("partner_profiles").insert({
      user_id: session.user.id,
      company: company.trim(),
      full_name: fullName.trim(),
      email,
      phone: phoneTrim || null,
      website: websiteValue,
      description: description.trim(),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    void track("signup_completed", { role: "partner" });
    navigate({ to: "/partner" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("common.back_home")}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">{t("partner.inscription.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("partner.inscription.subtitle")}
        </p>

        {step === "auth" ? (
          <form
            onSubmit={handleAuth}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <div className="flex gap-2 text-sm mb-2">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`px-3 py-1.5 rounded-full ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {t("auth.sign_up_btn")}
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`px-3 py-1.5 rounded-full ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {t("auth.have_account")}
              </button>
            </div>
            <FormInput label={t("auth.email")} type="email" value={email} onChange={setEmail} required />
            <FormInput
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : mode === "signup" ? t("common.create_account") : t("common.sign_in")}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleProfile}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            {sessionEmail && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                {t("auth.connected_as", { email: sessionEmail })}{" "}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="underline hover:text-foreground"
                >
                  {t("auth.sign_out_lowercase")}
                </button>
              </div>
            )}
            <FormInput
              label={t("partner.inscription.company_label")}
              value={company}
              onChange={setCompany}
              required
              placeholder="Ex. Agence Marketing Pro"
            />
            <FormInput
              label={t("partner.inscription.fullname_label")}
              value={fullName}
              onChange={setFullName}
              required
              placeholder="Ex. Jean Dupont"
            />
            <FormInput
              label={t("common.phone")}
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="Ex. +33 6 12 34 56 78"
            />
            <FormInput
              label={t("common.website_optional")}
              type="url"
              value={website}
              onChange={setWebsite}
              placeholder="https://votresite.fr"
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("partner.inscription.description_label")}
              </label>

              {/* AI assistant */}
              <AiAssistantPanel
                open={aiPanelOpen}
                onOpenChange={setAiPanelOpen}
                context={aiContext}
                onContextChange={setAiContext}
                onGenerate={handlePartnerAiGenerate}
                loading={aiLoading}
                error={aiError}
                sessionExpired={aiSessionExpired}
                sessionExpiredHref="/partner/inscription"
                title={t("partner.inscription.ai_panel_title")}
                description={t("partner.inscription.ai_panel_desc")}
                placeholder={t("partner.inscription.ai_placeholder")}
                generateLabel={t("partner.inscription.ai_generate")}
                generateLoadingLabel={t("partner.inscription.ai_generating")}
                filledMessage={aiFilled ? t("partner.inscription.ai_filled") : undefined}
                onDismissFilled={() => setAiFilled(false)}
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={1500}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Votre secteur d'activité, vos clients cibles, pourquoi vous souhaitez devenir partner MoveSpot…"
              />
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t("common.sending") : t("partner.inscription.submit_btn")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
      />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
      {children}
    </div>
  );
}
