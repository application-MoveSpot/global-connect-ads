import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { SignedInBanner } from "@/components/app/SignedInBanner";
import { HoneypotField } from "@/components/app/HoneypotField";
import { LogoLink } from "@/components/app/LogoLink";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import { RouteError } from "@/components/app/RouteError";

type Search = { redirect?: string };

export const Route = createFileRoute("/annonceur/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription annonceur — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AnnonceurInscription,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type AccountType = "business" | "individual";

function AnnonceurInscription() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/annonceur/inscription" });
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [accountType, setAccountType] = useState<AccountType>("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [acceptedCharte, setAcceptedCharte] = useState(false);
  const [siret, setSiret] = useState<SiretCheck>({
    siret: "",
    denomination: null,
    verified: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");

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
    if (honeypot) {
      setLoading(false);
      return;
    }
    if (mode === "signup") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/annonceur/inscription` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (
        signUpData.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
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
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { data: existing } = await supabase
          .from("advertiser_profiles")
          .select("id")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (existing) {
          goNext();
          return;
        }
      }
    }
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!acceptedCharte) {
      setError("Vous devez accepter la charte de contenu MoveSpot pour continuer.");
      return;
    }
    if (accountType === "business" && !siret.verified) {
      setError("Merci de vérifier votre numéro SIRET avant de continuer.");
      return;
    }
    if (accountType === "individual" && address.trim().length < 5) {
      setError("Merci d'indiquer une adresse postale complète.");
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError("Session expirée");
      setLoading(false);
      return;
    }
    const CGU_VERSION = "2026-08-24";
    const payload: Record<string, unknown> = {
      user_id: sess.session.user.id,
      full_name: fullName,
      phone: phone || null,
      city: city || null,
      account_type: accountType,
      cgu_version: CGU_VERSION,
      cgu_accepted_at: new Date().toISOString(),
    };
    if (accountType === "business") {
      payload.company = company || siret.denomination;
      payload.siret = siret.siret;
      payload.siret_denomination = siret.denomination;
      payload.siret_verified_at = new Date().toISOString();
    } else {
      payload.company = null;
      payload.address = address;
    }
    const { error } = await supabase.from("advertiser_profiles").insert(payload as never);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    void track("signup_completed", { role: "annonceur", account_type: accountType });
    goNext();
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Retour
        </Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? "Créer un compte annonceur" : "Connexion annonceur"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup"
                ? "Entreprise, association ou particulier — créez votre compte pour réserver des espaces publicitaires."
                : "Accédez à votre espace annonceur et vos campagnes."}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <div>
                <Input
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                />
                {mode === "signin" && (
                  <div className="mt-2 text-right">
                    <Link
                      to="/reset-password"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                )}
              </div>
              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>
            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === "signup"
                ? "Déjà un compte ? Se connecter"
                : "Pas encore inscrit ? Créer un compte"}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">Votre profil annonceur</h1>
            <SignedInBanner onSignedOut={() => setStep("auth")} />
            <p className="text-sm text-muted-foreground mb-6">
              Choisissez le type de compte qui vous correspond.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-lg bg-secondary">
              {(["business", "individual"] as AccountType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountType(t)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${accountType === t ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "business" ? "Entreprise / Asso" : "Particulier"}
                </button>
              ))}
            </div>

            <form onSubmit={handleProfile} className="space-y-4">
              <Input label="Nom complet *" value={fullName} onChange={setFullName} required />

              {accountType === "business" ? (
                <>
                  <SiretField value={siret} onChange={setSiret} />
                  <Input label="Entreprise / Association" value={company} onChange={setCompany} />
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Adresse postale *</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={2}
                      placeholder="N°, rue, code postal, ville"
                      className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <strong>Particulier :</strong> vous pouvez publier des briefs pour un mariage,
                    une association locale, l'ouverture d'un commerce, un événement culturel… <br />
                    <strong className="block mt-1">⛔ Strictement interdits :</strong> anniversaires
                    personnels, contenus religieux, politiques ou électoraux, sexistes,
                    pornographiques ou violents. Tout brief non conforme sera refusé sans
                    remboursement des frais de contrôle.
                  </div>
                </>
              )}

              <Input label="Téléphone" type="tel" value={phone} onChange={setPhone} />
              <Input label="Ville" value={city} onChange={setCity} />

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedCharte}
                  onChange={(e) => setAcceptedCharte(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  J'ai lu et j'accepte les{" "}
                  <Link to="/cgu" className="underline hover:text-foreground">
                    Conditions Générales d'Utilisation
                  </Link>{" "}
                  MoveSpot, notamment la charte de contenu publicitaire et l'
                  <strong>obligation d'exclusivité des transactions sur la plateforme</strong> (art.
                  22). Je comprends que tout accord conclu hors-plateforme reste soumis à la
                  commission MoveSpot.
                </span>
              </label>

              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : "Continuer"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
      {msg}
    </div>
  );
}
