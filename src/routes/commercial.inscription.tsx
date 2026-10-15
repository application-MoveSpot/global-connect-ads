import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { createCommercialProfile } from "@/lib/commercial/commercial.functions";
import { generateCommercialInscriptionSuggestion } from "@/lib/ai/commercial-inscription-assistant.functions";
import { isValidFrenchPhone, normalizePhone } from "@/lib/phone";
import { LogoLink } from "@/components/app/LogoLink";
import { Eye, EyeOff } from "lucide-react";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/commercial/inscription")({
  head: () => ({
    meta: [
      { title: "Devenir apporteur d'affaires — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CommercialInscription,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function CommercialInscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [cguAccepted, setCguAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const createProfileFn = useServerFn(createCommercialProfile);
  const callCommercialAi = useServerFn(generateCommercialInscriptionSuggestion);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (session) {
        const { data: existing } = await (supabase as any)
          .from("commercial_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/commercial" });
        else setStep("profile");
      }
    })();
  }, [navigate]);

  const handleCommercialAiGenerate = async () => {
    setAiError("");
    setAiLoading(true);
    setAiSessionExpired(false);
    try {
      const session = await getOrRefreshSession();
      if (!session) {
        setAiSessionExpired(true);
        return;
      }
      const res = await callCommercialAi({ data: { commercialContext: aiContext, _auth: session.access_token } });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") {
          setAiSessionExpired(true);
          return;
        }
        setAiError(res.message);
        return;
      }
      const filled: string[] = [];
      if (res.suggestion.fullName) {
        setFullName(res.suggestion.fullName);
        filled.push(t("commercial.inscription.fullname_label").replace(" *", ""));
      }
      if (res.suggestion.company) {
        setCompany(res.suggestion.company);
        filled.push(t("commercial.inscription.company_label"));
      }
      if (res.suggestion.city) {
        setCity(res.suggestion.city);
        filled.push(t("commercial.inscription.city_label"));
      }
      setAiFilled(filled);
      if (filled.length > 0) setAiPanelOpen(false);
    } catch {
      setAiError(t("commercial.inscription.ai_generate_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "signup") {
      const { data: signUpData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/commercial/inscription` },
      });
      if (authErr) {
        setError(authErr.message);
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
    } else {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }
      const session = await getOrRefreshSession();
      if (session) {
        const { data: existing } = await (supabase as any)
          .from("commercial_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (existing) {
          navigate({ to: "/commercial" });
          return;
        }
      }
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone && !isValidFrenchPhone(phone)) {
      setError(t("common.phone_invalid"));
      return;
    }
    setLoading(true);
    const result = await createProfileFn({
      data: { fullName, phone: phone ? (normalizePhone(phone) ?? phone) : "", company, city },
    });
    if (!result.ok) {
      setError(result.error ?? t("common.error"));
      setLoading(false);
      return;
    }
    navigate({ to: "/commercial" });
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("commercial.inscription.back")}
        </Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup"
                ? t("commercial.inscription.title_signup")
                : t("commercial.inscription.title_signin")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? t("commercial.inscription.subtitle_signup")
                : t("commercial.inscription.subtitle_signin")}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <Field
                label={t("auth.email")}
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <Field
                label={t("auth.password")}
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />
              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading
                  ? "..."
                  : mode === "signup"
                    ? t("common.create_account")
                    : t("common.sign_in")}
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
                ? t("commercial.inscription.already_account")
                : t("commercial.inscription.not_registered")}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {t("commercial.inscription.profile_title")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("commercial.inscription.profile_subtitle")}
            </p>
            <AiAssistantPanel
              variant="inline"
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              title={t("commercial.inscription.ai_panel_title")}
              description={t("commercial.inscription.ai_panel_desc")}
              placeholder={t("commercial.inscription.ai_placeholder")}
              context={aiContext}
              onContextChange={setAiContext}
              onGenerate={handleCommercialAiGenerate}
              loading={aiLoading}
              error={aiError}
              sessionExpired={aiSessionExpired}
              sessionExpiredHref="/commercial/inscription?mode=signin"
              generateLabel={t("commercial.inscription.ai_generate")}
              generateLoadingLabel={t("commercial.inscription.ai_generating")}
              filledMessage={
                aiFilled.length > 0
                  ? t("commercial.inscription.ai_filled", { fields: aiFilled.join(", ") })
                  : undefined
              }
            />
            <form onSubmit={handleProfile} className="space-y-4">
              <Field
                label={t("commercial.inscription.fullname_label")}
                value={fullName}
                onChange={setFullName}
                required
              />
              <Field
                label={t("commercial.inscription.company_label")}
                value={company}
                onChange={setCompany}
              />
              <Field label={t("common.phone")} type="tel" value={phone} onChange={setPhone} />
              <Field
                label={t("commercial.inscription.city_label")}
                value={city}
                onChange={setCity}
              />
              {error && <Err msg={error} />}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                  required
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("commercial.inscription.cgu_text")}
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !cguAccepted}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : t("commercial.inscription.submit_btn")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className={isPassword ? "relative" : undefined}>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring${isPassword ? " pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
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
