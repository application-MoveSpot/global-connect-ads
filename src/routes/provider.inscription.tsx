import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { withAuthRetry } from "@/lib/auth/auth-retry";
import { track } from "@/lib/analytics/track";
import { Eye, EyeOff } from "lucide-react";
import { LogoLink } from "@/components/app/LogoLink";
import { HoneypotField } from "@/components/app/HoneypotField";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import {
  ProviderPortfolioUploader,
  type PortfolioItem,
} from "@/components/provider/ProviderPortfolioUploader";
import { verifyWebsite } from "@/lib/providers/website-verify.functions";
import { estimateProviderPricing } from "@/lib/providers/pricing-estimate.functions";
import { generateProviderSuggestion } from "@/lib/ai/provider-assistant.functions";
import { verifyProviderDocs } from "@/lib/ai/provider-doc-verify.functions";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { PROVIDER_SERVICES, type ProviderServiceKey } from "@/lib/providers/provider-services";
import {
  ProviderDocUpload,
  type DocUploadState,
} from "@/components/provider/ProviderDocUpload";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/provider/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription provider — MoveSpot" },
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
  const [coverageList, setCoverageList] = useState<string[]>([]);
  const [pricingInfo, setPricingInfo] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<ProviderServiceKey[]>(["covering_vehicule"]);
  const [docKbis, setDocKbis] = useState<DocUploadState>(null);
  const [docRcPro, setDocRcPro] = useState<DocUploadState>(null);
  const [rcProExpiry, setRcProExpiry] = useState("");
  const [docRib, setDocRib] = useState<DocUploadState>(null);
  const [docIdDoc, setDocIdDoc] = useState<DocUploadState>(null);
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const callProviderAi = useServerFn(generateProviderSuggestion);
  const callVerifyDocs = useServerFn(verifyProviderDocs);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (session) {
        const { data: existing } = await supabase
          .from("provider_profiles")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (existing) navigate({ to: "/provider" });
        else {
          setEmail(session.user.email ?? "");
          setSessionEmail(session.user.email ?? null);
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
    const {
      data: signUpData,
      error,
      wasServiceError,
    } = await withAuthRetry(() =>
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/provider/inscription` },
      }),
    );
    if (error) {
      setError(
        wasServiceError
          ? t("auth.error_service_unavailable")
          : (error.message ?? t("auth.error_network")),
      );
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

  const handleProviderAiGenerate = async () => {
    setAiError("");
    setAiSessionExpired(false);
    if (aiContext.trim().length < 10) {
      setAiError("Décrivez votre activité en au moins 10 caractères.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await callProviderAi({ data: { providerContext: aiContext.trim() } });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") {
          setAiSessionExpired(true);
          return;
        }
        setAiError(res.message);
        return;
      }
      const { suggestion } = res;
      const filled: string[] = [];
      if (suggestion.description) {
        setDescription(suggestion.description);
        filled.push("description");
      }
      if (suggestion.coverageAreas.length > 0) {
        setCoverageList((prev) => {
          const merged = [
            ...prev,
            ...suggestion.coverageAreas.filter((z: string) => !prev.includes(z)),
          ].slice(0, 30);
          return merged;
        });
        filled.push("zones");
      }
      if (suggestion.services.length > 0) {
        setServices(suggestion.services as ProviderServiceKey[]);
        filled.push("services");
      }
      setAiFilled(filled);
      setAiPanelOpen(false);
    } catch {
      setAiError("Une erreur inattendue est survenue. Réessayez.");
    } finally {
      setAiLoading(false);
    }
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
      setError(t("provider.inscription.error.no_service"));
      return;
    }
    if (!siretCheck.verified) {
      setError(t("provider.inscription.error.check_siret"));
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
      setError(t("provider.inscription.error.siret_mismatch"));
      return;
    }
    const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/;
    if (!nameRe.test(fullNameTrim)) {
      setError(t("provider.inscription.error.invalid_name"));
      return;
    }
    if (description.trim().length < 30) {
      setError(t("provider.inscription.error.short_description"));
      return;
    }
    const isProduction = import.meta.env.VITE_APP_MODE === "production";
    if (isProduction) {
      if (!docKbis) { setError(t("provider.inscription.error.missing_kbis")); return; }
      if (!docRcPro) { setError(t("provider.inscription.error.missing_rc_pro")); return; }
      if (!rcProExpiry) { setError(t("provider.inscription.error.missing_rc_pro_expiry")); return; }
      if (new Date(rcProExpiry) < new Date()) { setError(t("provider.inscription.error.rc_pro_expired")); return; }
      if (!docRib) { setError(t("provider.inscription.error.missing_rib")); return; }
    }
    const phoneTrim = phone.trim();
    if (phoneTrim && !/^[+\d][\d\s().-]{7,19}$/.test(phoneTrim)) {
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
        setError(t("provider.inscription.error.verify_site"));
        return;
      }
    }
    setLoading(true);
    const session = await getOrRefreshSession();
    if (!session) {
      setError(t("auth.error.session_expired"));
      setLoading(false);
      return;
    }
    const portfolioPaths = portfolio.map((p) => p.path);
    const { error } = await supabase.from("provider_profiles").insert({
      user_id: session.user.id,
      company: companyTrim,
      siret: siretCheck.siret,
      full_name: fullNameTrim,
      email,
      phone: phoneTrim,
      website: websiteValue,
      description,
      services,
      coverage_areas: coverageList.slice(0, 30),
      portfolio_urls: portfolioPaths,
      pricing_info: pricingInfo || null,
      kbis_url: docKbis?.path ?? null,
      rc_pro_url: docRcPro?.path ?? null,
      rc_pro_expiry: rcProExpiry || null,
      rib_url: docRib?.path ?? null,
      id_doc_url: docIdDoc?.path ?? null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (isProduction && (docKbis || docRcPro || docRib || docIdDoc)) {
      setAiVerifying(true);
      try {
        await callVerifyDocs({
          data: {
            kbisPath: docKbis?.path ?? null,
            rcProPath: docRcPro?.path ?? null,
            ribPath: docRib?.path ?? null,
            idDocPath: docIdDoc?.path ?? null,
          },
        });
      } catch {
        // AI failure is non-blocking — admin will review manually
      } finally {
        setAiVerifying(false);
      }
    }
    void track("signup_completed", { role: "provider" });
    navigate({ to: "/provider" });
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
        <h1 className="font-display text-3xl font-bold mb-2">{t("provider.inscription.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("provider.inscription.subtitle")}</p>

        {step === "auth" ? (
          <form
            onSubmit={handleAuth}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <Input
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Input
              label={t("provider.inscription.password_label")}
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
                      to="/provider/connexion"
                      className="font-medium text-primary hover:underline"
                    >
                      {t("provider.inscription.signin_link")}
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
              {t("provider.inscription.already_provider")}{" "}
              <Link
                to="/provider/connexion"
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
                {t("auth.connected_as")} <strong className="text-foreground">{sessionEmail}</strong>{" "}
                —{" "}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="underline hover:text-foreground"
                >
                  {t("auth.sign_out_lowercase")}
                </button>
              </div>
            )}

            {/* AI assistant panel */}
            <AiAssistantPanel
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              context={aiContext}
              onContextChange={setAiContext}
              onGenerate={handleProviderAiGenerate}
              loading={aiLoading}
              error={aiError}
              sessionExpired={aiSessionExpired}
              sessionExpiredHref="/provider/connexion"
              title={t("provider.inscription.ai_panel_title")}
              description={t("provider.inscription.ai_panel_desc")}
              placeholder={t("provider.inscription.ai_placeholder")}
              generateLabel={t("provider.inscription.ai_generate")}
              generateLoadingLabel={t("provider.inscription.ai_generating")}
              filledMessage={
                aiFilled.length > 0
                  ? t("provider.inscription.ai_filled", { fields: aiFilled.join(", ") })
                  : undefined
              }
              onDismissFilled={() => setAiFilled([])}
            />

            <Input
              label={t("provider.inscription.company_label")}
              value={company}
              onChange={setCompany}
              required
              placeholder="Raison sociale, ou nom commercial pour une entreprise individuelle"
            />
            <SiretField value={siretCheck} onChange={(v) => { setSiretCheck(v); if (v.verified) setError(""); }} required />
            <Input
              label={t("provider.inscription.fullname_label")}
              value={fullName}
              onChange={setFullName}
              required
              placeholder="Ex. Marie Dupont"
              hint={t("provider.inscription.fullname_hint")}
            />
            <Input
              label={`${t("common.phone")} (${t("common.optional", "optionnel")})`}
              type="tel"
              value={phone}
              onChange={setPhone}
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
                      setError(t("provider.inscription.error.site_verify"));
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
                  {t("provider.inscription.site_ok")}
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
            <Field label={t("provider.inscription.services_label")}>
              <p className="text-xs text-muted-foreground mb-2">
                {t("provider.inscription.services_hint")}
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
            <Field label={t("provider.inscription.description_label")}>
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
            <Field label={t("provider.inscription.coverage_label")}>
              <ZoneTagInput
                value={coverageList}
                onChange={setCoverageList}
                placeholder={t("provider.inscription.coverage_hint")}
              />
            </Field>
            <Field label={t("provider.inscription.pricing_label")}>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 mb-2">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {t("provider.inscription.ai_estimate_title")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("provider.inscription.ai_estimate_subtitle")}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={estimatingPricing || services.length === 0}
                    onClick={async () => {
                      setEstimatingPricing(true);
                      setError("");
                      try {
                        const res = await callEstimatePricing({
                          data: {
                            services,
                            coverage_areas: coverageList,
                            company: company.trim() || undefined,
                          },
                        });
                        if (res && Array.isArray(res.breakdown)) {
                          setPricingEstimate(res);
                          if (res.pricing_text) setPricingInfo(res.pricing_text);
                        } else {
                          throw new Error(t("provider.inscription.error.pricing_estimate"));
                        }
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "";
                        const isTechnical =
                          /API_KEY|secret|token|supabase|postgres|prisma|internal server/i.test(
                            msg,
                          );
                        setError(
                          isTechnical || !msg
                            ? t("provider.inscription.error.pricing_estimate")
                            : msg,
                        );
                      } finally {
                        setEstimatingPricing(false);
                      }
                    }}
                    className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {estimatingPricing
                      ? t("provider.inscription.estimating")
                      : t("provider.inscription.estimate_btn")}
                  </button>
                </div>
                {services.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("provider.inscription.select_service_hint")}
                  </p>
                )}
                {pricingEstimate && Array.isArray(pricingEstimate.breakdown) && (
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
                      {t("provider.inscription.prefilled_hint")}
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
            <Field label={t("provider.inscription.portfolio_label")}>
              <ProviderPortfolioUploader value={portfolio} onChange={setPortfolio} />
            </Field>

            {/* Documents justificatifs */}
            {sessionEmail && (
              <div className={`space-y-4 rounded-xl border p-4 ${import.meta.env.VITE_APP_MODE === "production" ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("provider.inscription.docs_title")}
                    {import.meta.env.VITE_APP_MODE === "production" && (
                      <span className="ml-2 text-xs font-normal text-destructive">*requis</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {import.meta.env.VITE_APP_MODE === "production"
                      ? t("provider.inscription.docs_subtitle_production", "Kbis, RC Pro et RIB obligatoires. L'IA vérifiera l'authenticité avant soumission.")
                      : t("provider.inscription.docs_subtitle")}
                  </p>
                </div>
                <ProviderDocUpload
                  label={t("provider.inscription.doc_kbis_label")}
                  hint={t("provider.inscription.doc_kbis_hint")}
                  docType="kbis"
                  userId={sessionEmail}
                  value={docKbis}
                  onChange={setDocKbis}
                />
                <ProviderDocUpload
                  label={t("provider.inscription.doc_rc_pro_label")}
                  hint={t("provider.inscription.doc_rc_pro_hint")}
                  docType="rc-pro"
                  userId={sessionEmail}
                  value={docRcPro}
                  onChange={setDocRcPro}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {t("provider.inscription.doc_rc_pro_expiry_label")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("provider.inscription.doc_rc_pro_expiry_hint")}
                  </p>
                  <input
                    type="date"
                    value={rcProExpiry}
                    onChange={(e) => setRcProExpiry(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm w-full"
                  />
                </div>
                <ProviderDocUpload
                  label={t("provider.inscription.doc_rib_label")}
                  hint={t("provider.inscription.doc_rib_hint")}
                  docType="rib"
                  userId={sessionEmail}
                  value={docRib}
                  onChange={setDocRib}
                />
                <ProviderDocUpload
                  label={t("provider.inscription.doc_id_label")}
                  hint={t("provider.inscription.doc_id_hint")}
                  docType="id-doc"
                  userId={sessionEmail}
                  value={docIdDoc}
                  onChange={setDocIdDoc}
                />
              </div>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}
            {aiVerifying && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary text-center">
                Vérification de vos documents en cours…
              </div>
            )}
            <button
              disabled={loading || aiVerifying}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {aiVerifying ? "Vérification IA en cours…" : loading ? t("common.sending") : t("provider.inscription.submit_btn")}
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
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <Field label={label}>
      <div className={isPassword ? "relative" : undefined}>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-border bg-background px-3 py-2${isPassword ? " pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
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
function ZoneTagInput({
  value,
  onChange,
  placeholder,
  max = 30,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [input, setInput] = useState("");

  const addZones = (raw: string) => {
    const zones = raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange([...value, ...zones.filter((z) => !value.includes(z))].slice(0, max));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addZones(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="w-full rounded-lg border border-border bg-background px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px] cursor-text">
      {value.map((z) => (
        <span
          key={z}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-xs font-medium px-2.5 py-0.5"
        >
          {z}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== z))}
            className="hover:text-destructive transition leading-none"
            aria-label={`Supprimer ${z}`}
          >
            ×
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) addZones(input);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
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
