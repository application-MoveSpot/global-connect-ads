import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { lovable } from "@/integrations/lovable";
import { getStoredUtm } from "@/lib/analytics/utm";
import { AppHeader } from "@/components/app/AppHeader";
import { withAuthRetry, isServiceUnavailable } from "@/lib/auth/auth-retry";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? { next: s.next }
      : {},
  head: () => ({
    meta: [
      { title: "Connexion — MoveSpot" },
      { name: "description", content: "Connectez-vous à votre espace MoveSpot." },
      { property: "og:title", content: "Connexion — MoveSpot" },
      { property: "og:description", content: "Connectez-vous à votre espace MoveSpot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const goNext = () => {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/admin" });
  };

  useEffect(() => {
    getOrRefreshSession().then(async (session) => {
      if (!session) return;
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") return;
      if (next) {
        window.location.href = next;
        return;
      }
      navigate({ to: "/admin" });
    });
  }, [navigate, next]);

  const checkMfaThenGo = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chErr || !ch) {
          setError(chErr?.message ?? t("auth.error_mfa"));
          return;
        }
        setMfa({ factorId: totp.id, challengeId: ch.id });
        return;
      }
    }
    goNext();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRetrying(false);
    setLoading(true);
    if (mode === "signup") {
      const utm = getStoredUtm();
      const { error, wasServiceError } = await withAuthRetry(
        () =>
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}${next ?? "/admin"}`,
              ...(utm ? { data: { utm } } : {}),
            },
          }),
        { onRetry: () => setRetrying(true) },
      );
      setRetrying(false);
      if (error)
        setError(
          wasServiceError
            ? t("auth.error_service_unavailable")
            : (error.message ?? t("auth.error_network")),
        );
      else goNext();
    } else {
      const { error, wasServiceError } = await withAuthRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        { onRetry: () => setRetrying(true) },
      );
      setRetrying(false);
      if (error)
        setError(
          wasServiceError
            ? t("auth.error_service_unavailable")
            : (error.message ?? t("auth.error_network")),
        );
      else await checkMfaThenGo();
    }
    setLoading(false);
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: mfa.challengeId,
      code: mfaCode,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMfa(null);
    setMfaCode("");
    goNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("auth.back_to_home")}
        </Link>
        <h1 className="font-display text-3xl font-bold mt-4 mb-2">
          {mfa ? t("auth.mfa_title") : mode === "signin" ? t("auth.signin") : t("auth.signup")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mfa
            ? t("auth.mfa_desc")
            : mode === "signin"
              ? t("auth.signin_desc")
              : t("auth.signup_desc")}
        </p>

        {mfa ? (
          <form onSubmit={submitMfa} className="space-y-4">
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium mb-1.5">
                {t("auth.mfa_title")}
              </label>
              <input
                id="mfa-code"
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder={t("auth.mfa_code_placeholder")}
                autoComplete="one-time-code"
                aria-required="true"
                className="w-full rounded-lg bg-input border border-border px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading ? "…" : t("auth.mfa_verify")}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setMfa(null);
                setMfaCode("");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t("auth.mfa_cancel")}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5">
                  {t("auth.email")}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.email_placeholder")}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium mb-1.5">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.password_placeholder")}
                    className="w-full rounded-lg bg-input border border-border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
              {error && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {retrying
                  ? t("auth.retrying")
                  : loading
                    ? t("auth.loading")
                    : mode === "signin"
                      ? t("auth.submit_signin")
                      : t("auth.submit_signup")}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("common.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}${next ?? "/admin"}`,
                });
                if (result.error) setError(result.error.message);
                else if (!result.redirected) goNext();
              }}
              className="w-full rounded-lg border border-border bg-card hover:bg-secondary py-3 font-semibold flex items-center justify-center gap-2 transition"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Continuer avec Google
            </button>

            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === "signin" ? t("auth.switch_to_signup") : t("auth.switch_to_signin")}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
