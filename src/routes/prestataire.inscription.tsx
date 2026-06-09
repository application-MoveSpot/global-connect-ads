import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/prestataire/inscription")({
  component: ProviderSignupPage,
});

function ProviderSignupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [siret, setSiret] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [coverage, setCoverage] = useState("");
  const [pricingInfo, setPricingInfo] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: existing } = await supabase
          .from("provider_profiles")
          .select("user_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/prestataire" });
        else { setEmail(data.session.user.email ?? ""); setStep("profile"); }
      }
    })();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/prestataire/inscription` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setStep("profile"); setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (description.trim().length < 30) { setError("Décrivez votre activité en au moins 30 caractères."); return; }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const coverageList = coverage.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 30);
    const portfolioList = portfolio.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const { error } = await supabase.from("provider_profiles").insert({
      user_id: sess.session.user.id,
      company, siret: siret || null, full_name: fullName, email,
      phone: phone || null, website: website || null,
      description, services: ["covering_vehicule"],
      coverage_areas: coverageList, portfolio_urls: portfolioList,
      pricing_info: pricingInfo || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate({ to: "/prestataire" });
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
        <h1 className="font-display text-3xl font-bold mb-2">Devenir prestataire MoveSpot</h1>
        <p className="text-sm text-muted-foreground mb-6">Proposez vos services d'impression covering véhicule aux annonceurs. Votre fiche sera publiée après validation par MoveSpot.</p>

        {step === "auth" ? (
          <form onSubmit={handleAuth} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex gap-2 text-sm mb-2">
              <button type="button" onClick={() => setMode("signup")} className={`px-3 py-1.5 rounded-full ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>S'inscrire</button>
              <button type="button" onClick={() => setMode("signin")} className={`px-3 py-1.5 rounded-full ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>J'ai déjà un compte</button>
            </div>
            <Input label="Email" type="email" value={email} onChange={setEmail} required />
            <Input label="Mot de passe" type="password" value={password} onChange={setPassword} required />
            {error && <ErrorBox>{error}</ErrorBox>}
            <button disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
              {loading ? "…" : (mode === "signup" ? "Créer mon compte" : "Se connecter")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleProfile} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Input label="Société" value={company} onChange={setCompany} required />
            <Input label="SIRET (optionnel)" value={siret} onChange={setSiret} />
            <Input label="Nom du contact" value={fullName} onChange={setFullName} required />
            <Input label="Téléphone" value={phone} onChange={setPhone} />
            <Input label="Site web" value={website} onChange={setWebsite} placeholder="https://..." />
            <Field label="Description de votre activité">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={1500} rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Expertise, machines, types de covering, délais habituels…" />
            </Field>
            <Field label="Zones d'intervention (une par ligne ou virgules)">
              <textarea value={coverage} onChange={(e) => setCoverage(e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Paris&#10;Île-de-France&#10;Lyon" />
            </Field>
            <Field label="Indication tarifaire (optionnel)">
              <textarea value={pricingInfo} onChange={(e) => setPricingInfo(e.target.value)} rows={2} maxLength={500}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Ex. À partir de 450 € pour un demi-covering, 900 € pour un total covering." />
            </Field>
            <Field label="Portfolio (URLs, une par ligne)">
              <textarea value={portfolio} onChange={(e) => setPortfolio(e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="https://monsite.com/realisation-1" />
            </Field>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Envoi…" : "Soumettre ma fiche pour validation"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2" />
    </Field>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1.5">{label}</label>{children}</div>;
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{children}</div>;
}
