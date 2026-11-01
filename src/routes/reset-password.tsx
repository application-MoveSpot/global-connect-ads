import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detect recovery link (Supabase places "type=recovery" in URL hash)
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      setMode("update");
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setInfo(t("reset_password.email_sent"));
    setLoading(false);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    if (password.length < 8) {
      setError(t("reset_password.password_too_short"));
      setLoading(false);
      return;
    }
    if (password !== password2) {
      setError(t("reset_password.passwords_mismatch"));
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setInfo(t("reset_password.updated"));
      setTimeout(() => navigate({ to: "/" }), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <Link
          to="/auth"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("reset_password.back_to_login")}
        </Link>
        <h1 className="font-display text-3xl font-bold mt-4 mb-2">
          {mode === "request"
            ? t("reset_password.title_request")
            : t("reset_password.title_update")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "request"
            ? t("reset_password.subtitle_request")
            : t("reset_password.subtitle_update")}
        </p>

        {mode === "request" ? (
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">
                {t("auth.email")}
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                {info}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading ? "..." : t("reset_password.send_link_btn")}
            </button>
          </form>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
                {t("reset_password.new_password_label")}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
                {t("reset_password.confirm_label")}
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword2 ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword2 ? "Masquer" : "Afficher"}
                >
                  {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                {info}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading ? "..." : t("reset_password.update_btn")}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
