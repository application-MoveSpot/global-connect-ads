import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/partenaire/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription partenaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerSignupPage,
});

function PartnerSignupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("partner_profiles")
          .select("user_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/partenaire" });
        else {
          setEmail(data.session.user.email ?? "");
          setSessionEmail(data.session.user.email ?? null);
          setStep("profile");
        }
      }
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setStep("auth");
    setMode("signup");
    setError("");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (mode === "signup") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/partenaire/inscription` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (signUpData.user?.identities?.length === 0) {
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
      setSessionEmail(signUpData.session.user.email ?? null);
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setSessionEmail(signInData.session?.user.email ?? null);
    }
    setStep("profile"); setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (company.trim().length < 2) { setError("Nom de l'entreprise invalide."); return; }
    const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/;
    if (!nameRe.test(fullName.trim())) { setError("Indiquez le prénom et le nom du responsable."); return; }
    if (description.trim().length < 30) { setError("Décrivez votre activité en au moins 30 caractères."); return; }
    const phoneTrim = phone.trim();
    if (phoneTrim && !/^[+\d][\d\s().-]{7,19}$/.test(phoneTrim)) { setError("Numéro de téléphone invalide."); return; }
    const websiteTrim = website.trim();
    let websiteValue: string | null = null;
    if (websiteTrim) {
      try {
        const u = new URL(websiteTrim);
        if (u.protocol !== "https:") { setError("Le site web doit utiliser HTTPS."); return; }
        websiteValue = u.toString();
      } catch { setError("URL de site web invalide."); return; }
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const { error } = await supabase.from("partner_profiles").insert({
      user_id: sess.session.user.id,
      company: company.trim(),
      full_name: fullName.trim(),
      email,
      phone: phoneTrim || null,
      website: websiteValue,
      description: description.trim(),
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate({ to: "/partenaire" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Accueil</Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">Devenir partenaire MoveSpot</h1>
        <p className="text-sm text-muted-foreground mb-6">
          En tant que partenaire, référencez des clients, proposez des offres exclusives et développez votre réseau avec MoveSpot.
        </p>

        {step === "auth" ? (
          <form onSubmit={handleAuth} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex gap-2 text-sm mb-2">
              <button type="button" onClick={() => setMode("signup")}
                className={`px-3 py-1.5 rounded-full ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                S'inscrire
              </button>
              <button type="button" onClick={() => setMode("signin")}
                className={`px-3 py-1.5 rounded-full ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                J'ai déjà un compte
              </button>
            </div>
            <FormInput label="Email" type="email" value={email} onChange={setEmail} required />
            <FormInput label="Mot de passe" type="password" value={password} onChange={setPassword} required />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
              {loading ? "…" : (mode === "signup" ? "Créer mon compte" : "Se connecter")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleProfile} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            {sessionEmail && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                Connecté en tant que <strong className="text-foreground">{sessionEmail}</strong> —{" "}
                <button type="button" onClick={handleSignOut} className="underline hover:text-foreground">
                  se déconnecter
                </button>
              </div>
            )}
            <FormInput label="Nom de l'entreprise ou structure" value={company} onChange={setCompany} required placeholder="Ex. Agence Marketing Pro" />
            <FormInput label="Nom et prénom du responsable" value={fullName} onChange={setFullName} required placeholder="Ex. Jean Dupont" />
            <FormInput label="Téléphone" type="tel" value={phone} onChange={setPhone} placeholder="Ex. +33 6 12 34 56 78" />
            <FormInput label="Site web (optionnel)" type="url" value={website} onChange={setWebsite} placeholder="https://votresite.fr" />
            <div>
              <label className="block text-sm font-medium mb-1.5">Décrivez votre activité et votre intérêt pour le partenariat</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={1500} rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Votre secteur d'activité, vos clients cibles, pourquoi vous souhaitez devenir partenaire MoveSpot…" />
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Envoi…" : "Soumettre ma candidature"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2" />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{children}</div>;
}
