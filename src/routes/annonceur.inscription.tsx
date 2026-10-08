import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { SignedInBanner } from "@/components/app/SignedInBanner";
import { HoneypotField } from "@/components/app/HoneypotField";
import { LogoLink } from "@/components/app/LogoLink";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import { RouteError } from "@/components/app/RouteError";
import { resolveReferralCode } from "@/lib/commercial/commercial.functions";
import { resolveAdvertiserInviteCode } from "@/lib/referral/advertiser-referral.functions";
import { useTranslation } from "react-i18next";

type Search = { redirect?: string; ref?: string; invite?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/annonceur/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription annonceur — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    ref: typeof s.ref === "string" ? s.ref.toUpperCase() : undefined,
    invite: typeof s.invite === "string" ? s.invite.toUpperCase() : undefined,
    mode: s.mode === "signin" || s.mode === "signup" ? s.mode : undefined,
  }),
  component: AnnonceurInscription,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type AccountType = "business" | "individual";

function AnnonceurInscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redirect, ref, invite, mode: modeParam } = useSearch({ from: "/annonceur/inscription" });
  const [mode, setMode] = useState<"signup" | "signin">(modeParam ?? "signup");
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
  const [commercialId, setCommercialId] = useState<string | null>(null);
  const [commercialName, setCommercialName] = useState<string | null>(null);
  const [inviteAdvertiserId, setInviteAdvertiserId] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const resolveRefFn = useServerFn(resolveReferralCode);
  const resolveInviteFn = useServerFn(resolveAdvertiserInviteCode);

  const goNext = () => {
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/annonceur" });
  };

  useEffect(() => {
    if (ref) {
      resolveRefFn({ data: { code: ref } }).then((res: any) => {
        if (res.ok) {
          setCommercialId(res.commercialId);
          setCommercialName(res.name);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  useEffect(() => {
    if (invite) {
      resolveInviteFn({ data: { code: invite } }).then((res: any) => {
        if (res.ok) {
          setInviteAdvertiserId(res.advertiserId);
          setInviterName(res.name);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite]);

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
        setError(t("annonceur.inscription.error_duplicate"));
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setMode("signin");
        setError(t("annonceur.inscription.error_verify_email"));
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
      setError(t("annonceur.inscription.error_charte"));
      return;
    }
    if (accountType === "business" && !siret.verified) {
      setError(t("annonceur.inscription.error_siret"));
      return;
    }
    if (accountType === "individual" && address.trim().length < 5) {
      setError(t("annonceur.inscription.error_address"));
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError(t("annonceur.inscription.error_session"));
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
      commercial_id: commercialId ?? null,
      referred_by_advertiser_id: inviteAdvertiserId ?? null,
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
          {t("annonceur.inscription.back")}
        </Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? t("annonceur.inscription.auth_signup_title") : t("annonceur.inscription.auth_signin_title")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup" ? t("annonceur.inscription.auth_signup_desc") : t("annonceur.inscription.auth_signin_desc")}
              {mode === "signup" && (
                <>
                  {" "}
                  <Link to="/annonceur/briefs/nouveau" className="text-primary underline text-xs">
                    {t("annonceur.inscription.no_account_link")}
                  </Link>
                  {" · "}
                  <Link to="/annonceur/exemples" className="text-primary underline text-xs">
                    {t("annonceur.inscription.examples_link")}
                  </Link>
                </>
              )}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              <Input label={t("annonceur.inscription.label_email")} type="email" value={email} onChange={setEmail} required />
              <div>
                <Input
                  label={t("annonceur.inscription.label_password")}
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
                      {t("annonceur.inscription.forgot_password")}
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
                {loading ? "..." : mode === "signup" ? t("annonceur.inscription.btn_signup") : t("annonceur.inscription.btn_signin")}
              </button>
            </form>
            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === "signup" ? t("annonceur.inscription.toggle_to_signin") : t("annonceur.inscription.toggle_to_signup")}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">{t("annonceur.inscription.profile_title")}</h1>
            <SignedInBanner onSignedOut={() => setStep("auth")} />
            {commercialName && (
              <div
                className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400"
                dangerouslySetInnerHTML={{ __html: t("annonceur.inscription.referral_banner", { name: commercialName }) }}
              />
            )}
            {inviterName && (
              <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-700 dark:text-violet-400">
                🎁 {t("annonceur.inscription.invite_banner", { name: inviterName })}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4 mb-6">
              {t("annonceur.inscription.profile_desc")}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-lg bg-secondary">
              {(["business", "individual"] as AccountType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${accountType === type ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {type === "business" ? t("annonceur.inscription.type_business") : t("annonceur.inscription.type_individual")}
                </button>
              ))}
            </div>

            <form onSubmit={handleProfile} className="space-y-4">
              <Input label={t("annonceur.inscription.label_full_name")} value={fullName} onChange={setFullName} required />

              {accountType === "business" ? (
                <>
                  <SiretField value={siret} onChange={setSiret} />
                  <Input label={t("annonceur.inscription.label_company")} value={company} onChange={setCompany} />
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("annonceur.inscription.label_address")}</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={2}
                      placeholder={t("annonceur.inscription.address_placeholder")}
                      className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
                    dangerouslySetInnerHTML={{ __html: t("annonceur.inscription.individual_warning") }}
                  />
                </>
              )}

              <Input label={t("annonceur.inscription.label_phone")} type="tel" value={phone} onChange={setPhone} />
              <Input label={t("annonceur.inscription.label_city")} value={city} onChange={setCity} />

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedCharte}
                  onChange={(e) => setAcceptedCharte(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span dangerouslySetInnerHTML={{ __html: t("annonceur.inscription.cgu_label") }} />
              </label>

              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : t("annonceur.inscription.btn_continue")}
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
