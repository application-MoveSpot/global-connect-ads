import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { SiretField, type SiretCheck } from "@/components/SiretField";

export const Route = createFileRoute("/proprietaire/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription propriétaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InscriptionPage,
});

function InscriptionPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [siret, setSiret] = useState<SiretCheck>({ siret: "", denomination: null, verified: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("owner_profiles")
          .select("id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) {
          navigate({ to: "/proprietaire" });
        } else {
          setStep("profile");
        }
      }
    })();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/proprietaire/inscription` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!siret.verified) {
      setError("Merci de vérifier votre numéro SIRET avant de continuer.");
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const { error } = await supabase.from("owner_profiles").insert({
      user_id: sess.session.user.id,
      full_name: fullName,
      phone: phone || null,
      company: company || siret.denomination,
      city: city || null,
      bio: bio || null,
      siret: siret.siret,
      siret_denomination: siret.denomination,
      siret_verified_at: new Date().toISOString(),
    });
    if (error) { setError(error.message); setLoading(false); return; }
    navigate({ to: "/proprietaire/vehicules/nouveau" });
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link to="/devenir-partenaire" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Devenir partenaire" : "Connexion propriétaire"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup" ? "Créez votre compte pour proposer vos véhicules." : "Accédez à votre espace propriétaire."}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <div>
                <Input label="Mot de passe" type="password" value={password} onChange={setPassword} required minLength={6} />
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
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil</h1>
            <p className="text-sm text-muted-foreground mb-6">Quelques infos pour vous identifier auprès des annonceurs.</p>
            <form onSubmit={handleProfile} className="space-y-4">
              <Input label="Nom complet *" value={fullName} onChange={setFullName} required />
              <SiretField value={siret} onChange={setSiret} />
              <Input label="Téléphone" value={phone} onChange={setPhone} type="tel" />
              <Input label="Entreprise (si applicable)" value={company} onChange={setCompany} />
              <Input label="Ville" value={city} onChange={setCity} />
              <div>
                <label className="block text-sm font-medium mb-1.5">Bio courte</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : "Continuer → ajouter un véhicule"}
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
