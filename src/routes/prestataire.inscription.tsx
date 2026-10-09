import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { LogoLink } from "@/components/app/LogoLink";
import { HoneypotField } from "@/components/app/HoneypotField";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import {
  ProviderPortfolioUploader,
  type PortfolioItem,
} from "@/components/provider/ProviderPortfolioUploader";
import { verifyWebsite } from "@/lib/providers/website-verify.functions";
import { estimateProviderPricing } from "@/lib/providers/pricing-estimate.functions";
import { PROVIDER_SERVICES, type ProviderServiceKey } from "@/lib/providers/provider-services";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/prestataire/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription prestataire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderSignupPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function ProviderSignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [siretCheck, setSiretCheck] = useState<SiretCheck>({
    siret: "",
    denomination: null,
    verified: false,
  });
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
  const [websiteCheck, setWebsiteCheck] = useState<{
    ok: boolean;
    title?: string | null;
    warnings?: string[];
  } | null>(null);
  const [verifyingSite, setVerifyingSite] = useState(false);
  const callVerifyWebsite = useServerFn(verifyWebsite);
  const callEstimatePricing = useServerFn(estimateProviderPricing);
  const [pricingEstimate, setPricingEstimate] = useState<{
    breakdown: {
      service: string;
      label: string;
      price_min: number;
      price_max: number;
      unit: string;
      notes: string;
    }[];
    pricing_text: string;
    recommendation: string;
  } | null>(null);
  const [estimatingPricing, setEstimatingPricing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

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
    setError("");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (honeypot) {
      setLoading(false);
      return;
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/prestataire/inscription` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      setError(t("auth.error.email_exists"));
      setLoading(false);
      return;
    }
    if (!signUpData.session) {
      setError(t("auth.error.check_email"));
      setLoading(false);
      return;
    }
    setSessionEmail(signUpData.session.user.email ?? null);
    setStep("profile");
    setLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const companyTrim = company.trim();
    const fullNameTrim = fullName.trim();
    if (companyTrim.length < 2) {
      setError(t("auth.error.invalid_company"));
      return;
    }
    if (services.length === 0) {
      setError(t("prestataire.inscription.error.no_service"));
      return;
    }
    if (!siretCheck.verified) {
      setError(t("prestataire.inscription.error.check_siret"));
      return;
    }
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const denom = siretCheck.denomination ? norm(siretCheck.denomination) : "";
    const typed = norm(companyTrim);
    const denomTokens = new Set(denom.split(" ").filter((t) => t.length > 2));
    const typedTokens = typed.split(" ").filter((t) => t.length > 2);
    const overlap = typedTokens.filter((t) => denomTokens.has(t)).length;
    // Pour une entreprise individuelle (pas de raison sociale officielle), on accepte
    // un nom commercial libre — l'identité légale reste celle du chef d'entreprise.
    if (
      !siretCheck.isIndividual &&
      denom &&
      overlap === 0 &&
      !denom.includes(typed) &&
      !typed.includes(denom)
    ) {
      setError(
        t("prestataire.inscription.error.siret_mismatch"),
      );
      return;
    }
    const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/;
    if (!nameRe.test(fullNameTrim)) {
      setError(
        t("prestataire.inscription.error.invalid_name"),
      );
      return;
    }
    if (description.trim().length < 30) {
      setError(t("prestataire.inscription.error.short_description"));
      return;
    }
    const phoneTrim = phone.trim();
    if (!/^[+\d][\d\s().-]{7,19}$/.test(phoneTrim)) {
      setError(t("auth.error.invalid_phone"));
      return;
    }
    const websiteTrim = website.trim();
    let websiteValue: string | null = null;
    if (websiteTrim) {
      try {
        const u = new URL(websiteTrim);
        if (u.protocol !== "https:") {
          setError(t("auth.error.https_required"));
          return;
        }
        websiteValue = u.toString();
      } catch {
        setError(t("auth.error.invalid_url"));
        return;
      }
      if (!websiteCheck?.ok) {
        setError(t("prestataire.inscription.error.verify_site"));
        return;
      }
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError(t("auth.error.session_expired"));
      setLoading(false);
      return;
    }
    const coverageList = coverage
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    const portfolioPaths = portfolio.map((p) => p.path);
    const { error } = await supabase.from("provider_profiles").insert({
      user_id: sess.session.user.id,
      company: companyTrim,
      siret: siretCheck.siret,
      full_name: fullNameTrim,
      email,
      phone: phoneTrim,
      website: websiteValue,
      description,
      services,
      coverage_areas: coverageList,
      portfolio_urls: portfolioPaths,
      pricing_info: pricingInfo || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    void track("signup_completed", { role: "prestataire" });
    navigate({ to: "/prestataire" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("common.back_home")}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold mb-2">{t("prestataire.inscription.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("prestataire.inscription.subtitle")}
        </p>

        {step === "auth" ? (
          <form
            onSubmit={handleAuth}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <Input label={t("auth.email")} type="email" value={email} onChange={setEmail} required />
            <Input
              label={t("prestataire.inscription.password_label")}
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && (
              <div>
                <ErrorBox>{error}</ErrorBox>
                {error.includes("existe déjà") && (
                  <p className="mt-2 text-sm text-center">
                    <Link
                      to="/prestataire/connexion"
                      className="font-medium text-primary hover:underline"
                    >
                      {t("prestataire.inscription.signin_link")}
                    </Link>
                  </p>
                )}
              </div>
            )}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : t("common.create_account")}
            </button>
            <p className="text-center text-sm text-muted-foreground pt-1">
              {t("prestataire.inscription.already_provider")}{" "}
              <Link
                to="/prestataire/connexion"
                className="font-medium text-foreground hover:underline"
              >
                {t("common.sign_in")}
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleProfile}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            {sessionEmail && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                {t("auth.connected_as")} <strong className="text-foreground">{sessionEmail}</strong> —{" "}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="underline hover:text-foreground"
                >
                  {t("auth.sign_out_lowercase")}
                </button>
              </div>
            )}
            <Input
              label={t("prestataire.inscription.company_label")}
              value={company}
              onChange={setCompany}
              required
              placeholder="Raison sociale, ou nom commercial pour une entreprise individuelle"
            />
            <SiretField value={siretCheck} onChange={setSiretCheck} required />
            <Input
              label={t("prestataire.inscription.fullname_label")}
              value={fullName}
              onChange={setFullName}
              required
              placeholder="Ex. Marie Dupont"
              hint={t("prestataire.inscription.fullname_hint")}
            />
            <Input
              label={t("common.phone")}
              type="tel"
              value={phone}
              onChange={setPhone}
              required
              placeholder="Ex. +33 6 12 34 56 78"
            />
            <Field label={t("common.website_optional")}>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    setWebsiteCheck(null);
                  }}
                  placeholder="https://votre-entreprise.fr"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
                />
                <button
                  type="button"
                  disabled={verifyingSite || !website.trim()}
                  onClick={async () => {
                    setError("");
                    setWebsiteCheck(null);
                    setVerifyingSite(true);
                    try {
                      const r = await callVerifyWebsite({ data: { url: website.trim() } });
                      if (!r.ok) {
                        setError(r.error);
                        setWebsiteCheck({ ok: false });
                      } else setWebsiteCheck({ ok: true, title: r.title, warnings: r.warnings });
                    } catch {
                      setError(t("prestataire.inscription.error.site_verify"));
                    } finally {
                      setVerifyingSite(false);
                    }
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  {verifyingSite ? "…" : t("common.verify")}
                </button>
              </div>
              {websiteCheck?.ok && (
                <div className="mt-2 text-xs rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                  {t("prestataire.inscription.site_ok")}
                  {websiteCheck.title ? ` — « ${websiteCheck.title} »` : ""}.
                  {websiteCheck.warnings && websiteCheck.warnings.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-amber-700 dark:text-amber-300">
                      {websiteCheck.warnings.map((w, i) => (
                        <li key={i}>⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Field>
            <Field label={t("prestataire.inscription.services_label")}>
              <p className="text-xs text-muted-foreground mb-2">
                {t("prestataire.inscription.services_hint")}
              </p>
              <div className="space-y-2">
                {PROVIDER_SERVICES.map((s) => {
                  const checked = services.includes(s.key);
                  return (
                    <label
                      key={s.key}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(s.key)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label={t("prestataire.inscription.description_label")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={1500}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Expertise, machines, types de covering, délais habituels…"
              />
            </Field>
            <Field label={t("prestataire.inscription.coverage_label")}>
              <textarea
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Paris&#10;Île-de-France&#10;Lyon"
              />
            </Field>
            <Field label={t("prestataire.inscription.pricing_label")}>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 mb-2">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-semibold">{t("prestataire.inscription.ai_estimate_title")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("prestataire.inscription.ai_estimate_subtitle")}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={estimatingPricing || services.length === 0}
                    onClick={async () => {
                      setEstimatingPricing(true);
                      setError("");
                      try {
                        const coverageList = coverage
                          .split(/\r?\n|,/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const res = await callEstimatePricing({
                          data: {
                            services,
                            coverage_areas: coverageList,
                            company: company.trim() || undefined,
                          },
                        });
                        setPricingEstimate(res);
                        if (res.pricing_text) setPricingInfo(res.pricing_text);
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "";
                        const isTechnical = /API_KEY|secret|token|supabase|postgres|prisma|internal server/i.test(msg);
                        setError(isTechnical || !msg ? t("prestataire.inscription.error.pricing_estimate") : msg);
                      } finally {
                        setEstimatingPricing(false);
                      }
                    }}
                    className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {estimatingPricing ? t("prestataire.inscription.estimating") : t("prestataire.inscription.estimate_btn")}
                  </button>
                </div>
                {services.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("prestataire.inscription.select_service_hint")}
                  </p>
                )}
                {pricingEstimate && (
                  <div className="space-y-2 mt-3">
                    <div className="grid gap-2">
                      {pricingEstimate.breakdown.map((b) => (
                        <div key={b.service} className="rounded-lg bg-card p-3">
                          <div className="text-xs font-semibold text-foreground mb-0.5">
                            {b.label}
                          </div>
                          <div className="text-sm font-bold text-primary">
                            {b.price_min} – {b.price_max} €
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.unit} · {b.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                    {pricingEstimate.recommendation && (
                      <div className="text-xs text-muted-foreground italic rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                        💡 {pricingEstimate.recommendation}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("prestataire.inscription.prefilled_hint")}
                    </p>
                  </div>
                )}
              </div>
              <textarea
                value={pricingInfo}
                onChange={(e) => setPricingInfo(e.target.value)}
                rows={6}
                maxLength={1500}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Ex. À partir de 450 € pour un demi-covering, 900 € pour un total covering."
              />
            </Field>
            <Field label={t("prestataire.inscription.portfolio_label")}>
              <ProviderPortfolioUploader value={portfolio} onChange={setPortfolio} />
            </Field>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t("common.sending") : t("prestataire.inscription.submit_btn")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Field>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
      {children}
    </div>
  );
}
