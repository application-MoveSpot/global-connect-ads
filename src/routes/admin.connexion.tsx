import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isAdmin } from "@/lib/admin/isAdmin";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/admin/connexion")({
  head: () => ({
    meta: [{ title: "Administration — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLoginPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = "ms_admin_auth_attempts";

type AttemptRecord = { count: number; lockedUntil: number | null; lastAttempt: number };

function readAttempts(): AttemptRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: null, lastAttempt: 0 };
    return JSON.parse(raw) as AttemptRecord;
  } catch {
    return { count: 0, lockedUntil: null, lastAttempt: 0 };
  }
}

function writeAttempts(rec: AttemptRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    /* */
  }
}

function recordFailure(): AttemptRecord {
  const rec = readAttempts();
  const now = Date.now();
  // Reset count if last attempt was over 1 hour ago
  const count = now - rec.lastAttempt > 3600_000 ? 1 : rec.count + 1;
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null;
  const next = { count, lockedUntil, lastAttempt: now };
  writeAttempts(next);
  return next;
}

function clearAttempts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}

function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [showPassword, setShowPassword] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick lockout countdown
  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        clearAttempts();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockoutUntil]);

  // Check existing session
  useEffect(() => {
    const rec = readAttempts();
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      setLockoutUntil(rec.lockedUntil);
    } else {
      setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - rec.count));
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setChecking(false);
        return;
      }
      // Check MFA level
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
        // MFA required — proceed to MFA step without redirecting
        setChecking(false);
        return;
      }
      // Verify admin role
      const adminOk = await isAdmin();
      if (adminOk) {
        navigate({ to: "/admin" });
      } else {
        await supabase.auth.signOut();
        setChecking(false);
      }
    })();
  }, [navigate]);

  const goAdmin = () => navigate({ to: "/admin" });

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
    goAdmin();
  };

  const handleGoogleLogin = async () => {
    const rec = readAttempts();
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      setLockoutUntil(rec.lockedUntil);
      return;
    }
    setError("");
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/admin/connexion",
    });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return; // browser redirects — loading stays true
    goAdmin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check lockout
    const rec = readAttempts();
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      setLockoutUntil(rec.lockedUntil);
      return;
    }

    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const updated = recordFailure();
      if (updated.lockedUntil) {
        setLockoutUntil(updated.lockedUntil);
        setAttemptsLeft(0);
      } else {
        setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - updated.count));
        setError(t("auth.invalid_credentials"));
      }
      setLoading(false);
      return;
    }

    // Verify admin role before granting access
    const adminOk = await isAdmin();
    if (!adminOk) {
      await supabase.auth.signOut();
      const updated = recordFailure();
      if (updated.lockedUntil) {
        setLockoutUntil(updated.lockedUntil);
        setAttemptsLeft(0);
      } else {
        setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - updated.count));
        setError(t("admin.connexion.not_admin"));
      }
      setLoading(false);
      return;
    }

    clearAttempts();
    setAttemptsLeft(MAX_ATTEMPTS);
    await checkMfaThenGo();
    setLoading(false);
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setError("");
    setLoading(true);
    const { error: mfaError } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: mfa.challengeId,
      code: mfaCode,
    });
    setLoading(false);
    if (mfaError) {
      setError(mfaError.message);
      return;
    }
    setMfa(null);
    setMfaCode("");
    goAdmin();
  };

  const lockoutMinutes = lockoutUntil ? Math.ceil((lockoutUntil - Date.now()) / 60_000) : 0;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("auth.back_to_home")}
        </Link>

        <h1 className="font-display text-3xl font-bold mt-4 mb-1">
          {mfa ? t("auth.mfa_title") : t("admin.connexion.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mfa ? t("auth.mfa_desc") : t("admin.connexion.subtitle")}
        </p>

        {lockoutUntil ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-center space-y-2">
            <div className="text-2xl">🔒</div>
            <p className="font-semibold text-destructive">{t("admin.connexion.lockout_title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("admin.connexion.lockout_desc", { minutes: lockoutMinutes })}
            </p>
          </div>
        ) : mfa ? (
          <form onSubmit={submitMfa} className="space-y-4">
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium mb-1.5">
                {t("auth.mfa_code_label")}
              </label>
              <input
                id="mfa-code"
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
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
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-sm font-medium hover:bg-muted transition disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              {t("auth.sign_in_with_google")}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("common.or")}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium mb-1.5">
                  {t("auth.email")}
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="admin-password" className="block text-sm font-medium">
                    {t("auth.password")}
                  </label>
                  <Link
                    to="/reset-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-input border border-border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {attemptsLeft < MAX_ATTEMPTS && attemptsLeft > 0 && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                  {t("admin.connexion.attempts_warning", { count: attemptsLeft })}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "…" : t("admin.connexion.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
