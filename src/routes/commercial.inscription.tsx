import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCommercialProfile } from "@/lib/commercial/commercial.functions";
import { LogoLink } from "@/components/app/LogoLink";
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
  const createProfileFn = useServerFn(createCommercialProfile);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await (supabase as any)
          .from("commercial_profiles")
          .select("id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/commercial" });
        else setStep("profile");
      }
    })();
  }, [navigate]);

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
      if (authErr) { setError(authErr.message); setLoading(false); return; }
      if (signUpData.user?.identities?.length === 0) {
        setMode("signin");
        setError("Un compte existe déjà avec cet email. Connectez-vous.");
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setMode("signin");
        setError("Vérifiez votre email puis connectez-vous.");
        setLoading(false);
        return;
      }
    } else {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) { setError(authErr.message); setLoading(false); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { data: existing } = await (supabase as any)
          .from("commercial_profiles")
          .select("id")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (existing) { navigate({ to: "/commercial" }); return; }
      }
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await createProfileFn({ data: { fullName, phone, company, city } });
    if (!result.ok) { setError(result.error ?? "Erreur"); setLoading(false); return; }
    navigate({ to: "/commercial" });
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4"><LogoLink /></div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Devenir apporteur d'affaires" : "Connexion commercial"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? "Apportez des annonceurs sur MoveSpot et touchez 10 % de commission sur chaque campagne."
                : "Accédez à votre espace commercial."}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <Field label="Email" type="email" value={email} onChange={setEmail} required />
              <Field label="Mot de passe" type="password" value={password} onChange={setPassword} required minLength={6} />
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">
              {mode === "signup" ? "Déjà un compte ? Se connecter" : "Pas encore inscrit ? Créer un compte"}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil commercial</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Votre lien de parrainage sera généré automatiquement.
            </p>
            <form onSubmit={handleProfile} className="space-y-4">
              <Field label="Nom complet *" value={fullName} onChange={setFullName} required />
              <Field label="Entreprise / Auto-entrepreneur" value={company} onChange={setCompany} />
              <Field label="Téléphone" type="tel" value={phone} onChange={setPhone} />
              <Field label="Ville" value={city} onChange={setCity} />
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
                  J'accepte les{" "}
                  <strong className="text-foreground">règles de conduite commerciale MoveSpot</strong>{" "}
                  : je m'engage à présenter MoveSpot honnêtement (plateforme de mise en relation),
                  sans promettre de revenus garantis, sans pratiques agressives, et sans
                  assimiler ce partenariat à un système pyramidal (MLM). Tout manquement
                  peut entraîner la désactivation de mon compte.
                </span>
              </label>
              <button type="submit" disabled={loading || !cguAccepted}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : "Créer mon espace commercial"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, minLength,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} required={required} minLength={minLength} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{msg}</div>
  );
}
