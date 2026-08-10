import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { SiretField, type SiretCheck } from "@/components/SiretField";

type Kind = "driver" | "installer" | "both";

export const Route = createFileRoute("/chauffeur/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription chauffeur / poseur — MoveSpot" },
      {
        name: "description",
        content:
          "Rejoignez le réseau MoveSpot en tant que chauffeur ou poseur de covering et liez votre IBAN pour recevoir vos reversements.",
      },
      { property: "og:title", content: "Inscription chauffeur / poseur — MoveSpot" },
      {
        property: "og:description",
        content: "Créez votre compte prestataire MoveSpot et recevez vos paiements automatiquement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChauffeurInscription,
});

function ChauffeurInscription() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<Kind>("driver");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [siret, setSiret] = useState<SiretCheck>({ siret: "", denomination: null, verified: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: existing } = await supabase
        .from("payee_profiles")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (existing) navigate({ to: "/chauffeur/espace" });
      else setStep("profile");
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
        options: { emailRedirectTo: `${window.location.origin}/chauffeur/inscription` },
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
          .from("payee_profiles")
          .select("id")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (existing) { navigate({ to: "/chauffeur/espace" }); return; }
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
      kind,
      full_name: fullName,
      phone: phone || null,
      city: city || null,
    };
    if (hasCompany) {
      payload.siret = siret.siret;
      payload.siret_denomination = siret.denomination;
      payload.siret_verified_at = new Date().toISOString();
    }
    const { error } = await supabase.from("payee_profiles").insert(payload as never);
    if (error) { setError(error.message); setLoading(false); return; }
    navigate({ to: "/chauffeur/espace" });
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4"><LogoLink /></div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Devenir chauffeur / poseur" : "Connexion prestataire"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? "Roulez avec une campagne ou posez les coverings — et recevez vos reversements directement sur votre IBAN."
                : "Accédez à votre espace chauffeur / poseur."}
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
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil prestataire</h1>
            <p className="text-sm text-muted-foreground mb-6">Étape 1/2 — vos informations. Étape 2 : liaison de votre IBAN via Stripe.</p>
            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Votre rôle *</label>
                <div className="grid gap-2">
                  {([
                    ["driver", "Chauffeur — je roule avec une campagne"],
                    ["installer", "Poseur — je pose les coverings / adhésifs"],
                    ["both", "Les deux"],
                  ] as [Kind, string][]).map(([value, label]) => (
                    <label key={value} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer ${kind === value ? "border-primary bg-primary/10" : "border-border"}`}>
                      <input type="radio" name="kind" checked={kind === value} onChange={() => setKind(value)} className="h-4 w-4" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input label="Nom complet *" value={fullName} onChange={setFullName} required />
              <Input label="Téléphone" type="tel" value={phone} onChange={setPhone} />
              <Input label="Ville / zone d'intervention" value={city} onChange={setCity} />

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={hasCompany} onChange={(e) => setHasCompany(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border" />
                <span>Je suis auto-entrepreneur / société (avec SIRET)</span>
              </label>
              {hasCompany && <SiretField value={siret} onChange={setSiret} />}

              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {loading ? "..." : "Continuer vers la liaison IBAN"}
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
