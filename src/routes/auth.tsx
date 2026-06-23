import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") return;
      navigate({ to: "/admin" });
    });
  }, [navigate]);

  const checkMfaThenGo = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chErr || !ch) {
          setError(chErr?.message ?? "Erreur MFA");
          return;
        }
        setMfa({ factorId: totp.id, challengeId: ch.id });
        return;
      }
    }
    navigate({ to: "/admin" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) setError(error.message);
      else navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
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
    navigate({ to: "/admin" });
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>
        <h1 className="font-display text-3xl font-bold mt-4 mb-2">
          {mfa ? "Vérification 2FA" : mode === "signin" ? "Connexion admin" : "Créer un compte"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mfa
            ? "Saisissez le code à 6 chiffres affiché dans votre application Authenticator."
            : mode === "signin"
              ? "Accédez au dashboard MoveSpot."
              : "Le premier compte créé devient automatiquement admin."}
        </p>

        {mfa ? (
          <form onSubmit={submitMfa} className="space-y-4">
            <input
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-full rounded-lg bg-input border border-border px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
            <button type="submit" disabled={loading || mfaCode.length !== 6}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              {loading ? "..." : "Vérifier"}
            </button>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); setMfa(null); setMfaCode(""); setError(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground">
              Annuler et se déconnecter
            </button>
          </form>
        ) : (
        <>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground mt-1">Min. 8 caractères. Les mots de passe compromis sont refusés.</p>
            )}
            {mode === "signin" && (
              <div className="mt-2 text-right">
                <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground underline">Mot de passe oublié ?</Link>
              </div>
            )}
          </div>
          {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: `${window.location.origin}/admin`,
            });
            if (result.error) setError(result.error.message);
            else if (!result.redirected) navigate({ to: "/admin" });
          }}
          className="w-full rounded-lg border border-border bg-card hover:bg-secondary py-3 font-semibold flex items-center justify-center gap-2 transition"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continuer avec Google
        </button>

        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">
          {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </button>
        </>
        )}
      </div>
    </div>

  );
}
