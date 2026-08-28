import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/prestataire/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion prestataire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderLoginPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function ProviderLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profile } = await supabase
          .from("provider_profiles")
          .select("user_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (profile) {
          navigate({ to: "/prestataire" });
        } else {
          navigate({ to: "/prestataire/inscription" });
        }
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message
      );
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("user_id")
      .eq("user_id", data.session.user.id)
      .maybeSingle();
    if (profile) {
      navigate({ to: "/prestataire" });
    } else {
      navigate({ to: "/prestataire/inscription" });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="font-display text-3xl font-bold mb-2">Espace prestataire</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Connectez-vous pour accéder à votre tableau de bord et gérer vos demandes de devis.
        </p>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="vous@entreprise.fr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Mot de passe</label>
              <Link
                to="/reset-password"
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pas encore prestataire MoveSpot ?{" "}
          <Link
            to="/prestataire/inscription"
            className="font-medium text-foreground hover:underline"
          >
            Créer mon compte
          </Link>
        </p>
      </main>
    </div>
  );
}
