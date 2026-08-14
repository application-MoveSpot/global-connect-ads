import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignedInBanner } from "@/components/app/SignedInBanner";
import { LogoLink } from "@/components/app/LogoLink";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";

type Search = { redirect?: string };

export const Route = createFileRoute("/partenaire/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription partenaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: PartenaireInscription,
});

function PartenaireInscription() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/partenaire/inscription" });
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [siret, setSiret] = useState<SiretCheck>({ siret: "", denomination: null, verified: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/partenaire" });
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("partner_profiles")
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
        options: { emailRedirectTo: `${window.location.origin}/partenaire/inscription` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        setMode("signin");
        setError("Un compte existe déjà avec cet email. Connectez-vous.");
        setLoading(false);
        return;
      }
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
          .from("partner_profiles")
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
    if (hasCompany && !siret.verified) {
      setError("Merci de vérifier votre numéro SIRET avant de continuer.");
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const payload: Record<string, unknown> = {
      user_id: sess.session.user.id,
      full_name: fullName,
      phone: phone || null,
      city: city || null,
      notes: notes || null,
    };
    if (hasCompany) {
      payload.company = company || siret.denomination;
      payload.siret = siret.siret;
      payload.siret_denomination = siret.denomination;
      payload.siret_verified_at = new Date().toISOString();
    }
    const { error } = await supabase.from("partner_profiles").insert(payload as never);
    if (error) { setError(error.message); setLoading(false); return; }
    goNext();
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4"><LogoLink /></div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Devenir partenaire" : "Connexion partenaire"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? "Apporteur d'affaires, agence ou revendeur — rejoignez le programme partenaire MoveSpot."
                : "Accédez à votre espace partenaire."}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <div>
                <Input label="Mot de passe" type="password" value={password} onChange={setPassword} required minLength={8} />
                {mode === "signin" && (
                  <div className="mt-2 text-right">
                    <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-foreground underline">Mot de passe oublié ?</Link>
                  </div>
                )}
              </div>
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
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil partenaire</h1>
            <SignedInBanner onSignedOut={() => setStep("auth")} />
            <p className="text-sm text-muted-foreground mb-6">Quelques infos pour finaliser votre inscription.</p>
            <form onSubmit={handleProfile} className="space-y-4">
              <Input label="Nom complet *" value={fullName} onChange={setFullName} required />

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={hasCompany} onChange={(e) => setHasCompany(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border" />
                <span>Je représente une entreprise / agence (avec SIRET)</span>
              </label>

              {hasCompany && (
                <>
                  <SiretField value={siret} onChange={setSiret} />
                  <Input label="Nom de l'entreprise / agence" value={company} onChange={setCompany} />
                </>
              )}

              <Input label="Téléphone" type="tel" value={phone} onChange={setPhone} />
              <Input label="Ville" value={city} onChange={setCity} />
              <div>
                <label className="block text-sm font-medium mb-1.5">Comment comptez-vous travailler avec MoveSpot ?</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                  placeholder="Apport d'annonceurs, mise en relation propriétaires, revente d'espaces…"
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : "Valider mon inscription"}
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
