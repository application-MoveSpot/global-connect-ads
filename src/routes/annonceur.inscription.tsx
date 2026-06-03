import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

type Search = { redirect?: string };

export const Route = createFileRoute("/annonceur/inscription")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AnnonceurInscription,
});

function AnnonceurInscription() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/annonceur/inscription" });
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/annonceur" });
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("advertiser_profiles")
          .select("id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) goNext();
        else setStep("profile");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "signup") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/annonceur/inscription` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      // Email déjà utilisé : Supabase renvoie 200 avec identities vide (anti-énumération).
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        setMode("signin");
        setError("Un compte existe déjà avec cet email. Connectez-vous.");
        setLoading(false);
        return;
      }
      // Pas de session = confirmation email requise.
      if (!signUpData.session) {
        setMode("signin");
        setError("Vérifiez votre email pour confirmer votre compte, puis connectez-vous.");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { data: existing } = await supabase
          .from("advertiser_profiles")
          .select("id")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (existing) { goNext(); return; }
      }
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const { error } = await supabase.from("advertiser_profiles").insert({
      user_id: sess.session.user.id,
      full_name: fullName,
      company: company || null,
      phone: phone || null,
      city: city || null,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    goNext();
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Créer un compte annonceur" : "Connexion annonceur"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? "Créez votre compte pour réserver des espaces publicitaires."
                : "Accédez à votre espace annonceur et vos campagnes."}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <Input label="Mot de passe" type="password" value={password} onChange={setPassword} required minLength={6} />
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">
              {mode === "signup" ? "Déjà un compte ? Se connecter" : "Pas encore inscrit ? Créer un compte"}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil annonceur</h1>
            <p className="text-sm text-muted-foreground mb-6">Quelques infos pour finaliser votre inscription.</p>
            <form onSubmit={handleProfile} className="space-y-4">
              <Input label="Nom complet *" value={fullName} onChange={setFullName} required />
              <Input label="Entreprise" value={company} onChange={setCompany} />
              <Input label="Téléphone" type="tel" value={phone} onChange={setPhone} />
              <Input label="Ville" value={city} onChange={setCity} />
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : "Continuer"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, minLength }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} required={required} minLength={minLength} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{msg}</div>;
}
