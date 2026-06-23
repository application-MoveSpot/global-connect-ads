import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

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
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detect recovery link (Supabase places "type=recovery" in URL hash)
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      setMode("update");
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setInfo("Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.");
    setLoading(false);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    if (password.length < 8) { setError("Le mot de passe doit faire au moins 8 caractères."); setLoading(false); return; }
    if (password !== password2) { setError("Les mots de passe ne correspondent pas."); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setInfo("Mot de passe mis à jour. Redirection…");
      setTimeout(() => navigate({ to: "/admin" }), 1200);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4"><LogoLink /></div>
        <Link to="/auth" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Connexion</Link>
        <h1 className="font-display text-3xl font-bold mt-4 mb-2">
          {mode === "request" ? "Mot de passe oublié" : "Nouveau mot de passe"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "request"
            ? "Saisissez votre email, nous vous enverrons un lien sécurisé."
            : "Choisissez un nouveau mot de passe (min. 8 caractères)."}
        </p>

        {mode === "request" ? (
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
            {info && <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">{info}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              {loading ? "..." : "Envoyer le lien"}
            </button>
          </form>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmer</label>
              <input type="password" required minLength={8} value={password2} onChange={(e) => setPassword2(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
            {info && <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">{info}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              {loading ? "..." : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
