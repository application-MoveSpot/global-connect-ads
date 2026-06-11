import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { SiretField, type SiretCheck } from "@/components/SiretField";
import { ProviderPortfolioUploader, type PortfolioItem } from "@/components/ProviderPortfolioUploader";
import { verifyWebsite } from "@/lib/website-verify.functions";
import { PROVIDER_SERVICES, type ProviderServiceKey } from "@/lib/provider-services";

export const Route = createFileRoute("/prestataire/inscription")({
  component: ProviderSignupPage,
});

const DEFAULT_PRICING = `Tarifs indicatifs (covering véhicule, hors pose) :
• Stickers / micro-perforé : à partir de 150 € par véhicule
• Demi-covering (latéraux + arrière) : à partir de 450 €
• Total covering (véhicule utilitaire) : à partir de 900 €
• Pose : 80 € / heure, ou forfait selon véhicule
Devis personnalisé après réception du brief.`;

function ProviderSignupPage() {
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [siretCheck, setSiretCheck] = useState<SiretCheck>({ siret: "", denomination: null, verified: false });
  const [fullName, setFullName] = useState("");
  const [description, setDescription] = useState("");
  const [coverage, setCoverage] = useState("");
  const [pricingInfo, setPricingInfo] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<ProviderServiceKey[]>(["covering_vehicule"]);
  const toggleService = (k: ProviderServiceKey) =>
    setServices((prev) => (prev.includes(k) ? prev.filter((s) => s !== k) : [...prev, k]));
  const [website, setWebsite] = useState("");
  const [websiteCheck, setWebsiteCheck] = useState<{ ok: boolean; title?: string | null; warnings?: string[] } | null>(null);
  const [verifyingSite, setVerifyingSite] = useState(false);
  const callVerifyWebsite = useServerFn(verifyWebsite);
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
    const companyTrim = company.trim();
    const fullNameTrim = fullName.trim();
    if (companyTrim.length < 2) { setError("Nom de l'entreprise invalide."); return; }
    if (services.length === 0) { setError("Sélectionnez au moins un type de prestation."); return; }
    if (!siretCheck.verified) { setError("Veuillez vérifier le SIRET de votre entreprise."); return; }
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const denom = siretCheck.denomination ? norm(siretCheck.denomination) : "";
    const typed = norm(companyTrim);
    const denomTokens = new Set(denom.split(" ").filter((t) => t.length > 2));
    const typedTokens = typed.split(" ").filter((t) => t.length > 2);
    const overlap = typedTokens.filter((t) => denomTokens.has(t)).length;
    // Pour une entreprise individuelle (pas de raison sociale officielle), on accepte
    // un nom commercial libre — l'identité légale reste celle du chef d'entreprise.
    if (!siretCheck.isIndividual && denom && overlap === 0 && !denom.includes(typed) && !typed.includes(denom)) {
      setError(`Le nom de l'entreprise ne correspond pas au SIRET (INSEE : « ${siretCheck.denomination} »).`);
      return;
    }
    const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/;
    if (!nameRe.test(fullNameTrim)) { setError("Indiquez le prénom et le nom du responsable / contact principal (lettres uniquement)."); return; }
    if (description.trim().length < 30) { setError("Décrivez votre activité en au moins 30 caractères."); return; }
    const phoneTrim = phone.trim();
    if (!/^[+\d][\d\s().-]{7,19}$/.test(phoneTrim)) { setError("Numéro de téléphone invalide."); return; }
    const websiteTrim = website.trim();
    let websiteValue: string | null = null;
    if (websiteTrim) {
      try {
        const u = new URL(websiteTrim);
        if (u.protocol !== "https:") { setError("Le site web doit utiliser HTTPS (https://...)."); return; }
        websiteValue = u.toString();
      } catch { setError("URL de site web invalide."); return; }
      if (!websiteCheck?.ok) { setError("Veuillez vérifier votre site web avant de soumettre."); return; }
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setError("Session expirée"); setLoading(false); return; }
    const coverageList = coverage.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 30);
    const portfolioPaths = portfolio.map((p) => p.path);
    const { error } = await supabase.from("provider_profiles").insert({
      user_id: sess.session.user.id,
      company: companyTrim, siret: siretCheck.siret, full_name: fullNameTrim, email,
      phone: phoneTrim, website: websiteValue,
      description, services: ["covering_vehicule"],
      coverage_areas: coverageList, portfolio_urls: portfolioPaths,
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
            <Input label="Société (raison sociale ou nom commercial)" value={company} onChange={setCompany} required placeholder="Raison sociale, ou nom commercial pour une entreprise individuelle" />
            <SiretField value={siretCheck} onChange={setSiretCheck} required />
            <Input label="Nom et prénom du responsable / contact principal" value={fullName} onChange={setFullName} required placeholder="Ex. Marie Dupont" hint="Ce nom sera affiché comme interlocuteur commercial sur votre fiche publique." />
            <Input label="Téléphone" type="tel" value={phone} onChange={setPhone} required placeholder="Ex. +33 6 12 34 56 78" />
            <Field label="Site web (optionnel)">
              <div className="flex gap-2">
                <input type="url" value={website}
                  onChange={(e) => { setWebsite(e.target.value); setWebsiteCheck(null); }}
                  placeholder="https://votre-entreprise.fr"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2" />
                <button type="button" disabled={verifyingSite || !website.trim()}
                  onClick={async () => {
                    setError(""); setWebsiteCheck(null); setVerifyingSite(true);
                    try {
                      const r = await callVerifyWebsite({ data: { url: website.trim() } });
                      if (!r.ok) { setError(r.error); setWebsiteCheck({ ok: false }); }
                      else setWebsiteCheck({ ok: true, title: r.title, warnings: r.warnings });
                    } catch { setError("Erreur lors de la vérification du site."); }
                    finally { setVerifyingSite(false); }
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50">
                  {verifyingSite ? "…" : "Vérifier"}
                </button>
              </div>
              {websiteCheck?.ok && (
                <div className="mt-2 text-xs rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                  ✅ Site sécurisé (HTTPS) accessible{websiteCheck.title ? ` — « ${websiteCheck.title} »` : ""}.
                  {websiteCheck.warnings && websiteCheck.warnings.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-amber-700 dark:text-amber-300">
                      {websiteCheck.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </Field>
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
            <Field label="Indication tarifaire">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Vous pouvez générer une grille type puis l'ajuster.</span>
                <button type="button" onClick={() => setPricingInfo(DEFAULT_PRICING)}
                  className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-secondary">
                  ⚡ Auto-remplir
                </button>
              </div>
              <textarea value={pricingInfo} onChange={(e) => setPricingInfo(e.target.value)} rows={6} maxLength={1500}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Ex. À partir de 450 € pour un demi-covering, 900 € pour un total covering." />
            </Field>
            <Field label="Portfolio — images et vidéos de vos réalisations">
              <ProviderPortfolioUploader value={portfolio} onChange={setPortfolio} />
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

function Input({ label, value, onChange, type = "text", required, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; hint?: string }) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2" />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Field>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1.5">{label}</label>{children}</div>;
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{children}</div>;
}
