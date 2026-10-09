import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { isValidFrenchPhone, normalizePhone } from "@/lib/phone";
import { track } from "@/lib/analytics/track";
import { SignedInBanner } from "@/components/app/SignedInBanner";
import { HoneypotField } from "@/components/app/HoneypotField";
import { LogoLink } from "@/components/app/LogoLink";
import { SiretField, type SiretCheck } from "@/components/shared/SiretField";
import { RouteError } from "@/components/app/RouteError";

type Kind = "driver" | "installer" | "both";

export const Route = createFileRoute("/driver/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription driver / poseur — MoveSpot" },
      {
        name: "description",
        content:
          "Rejoignez le réseau MoveSpot en tant que driver ou poseur de covering et liez votre IBAN pour recevoir vos reversements.",
      },
      { property: "og:title", content: "Inscription driver / poseur — MoveSpot" },
      {
        property: "og:description",
        content:
          "Créez votre compte provider MoveSpot et recevez vos paiements automatiquement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChauffeurInscription,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const VEHICLE_KIND_VALUES = ["micro_mobility", "voiture", "utilitaire"] as const;
type VehicleKind = (typeof VEHICLE_KIND_VALUES)[number];

function ChauffeurInscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<Kind>("driver");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>("voiture");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [siret, setSiret] = useState<SiretCheck>({
    siret: "",
    denomination: null,
    verified: false,
  });
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: existing } = await supabase
        .from("payee_profiles")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (existing) navigate({ to: "/driver/espace" });
      else setStep("profile");
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
        options: { emailRedirectTo: `${window.location.origin}/driver/inscription` },
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
        setError(t("driver.inscription.error_email_exists"));
        setLoading(false);
        return;
      }
      if (!signUpData.session) {
        setMode("signin");
        setError(t("driver.inscription.error_confirm_email"));
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
          .from("payee_profiles")
          .select("id")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (existing) {
          navigate({ to: "/driver/espace" });
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
    if (!acceptedCGU) {
      setError(t("driver.inscription.error_cgu"));
      return;
    }
    if (hasCompany && !siret.verified) {
      setError(t("driver.inscription.error_siret"));
      return;
    }
    if (phone && !isValidFrenchPhone(phone)) {
      setError(t("common.phone_invalid"));
      return;
    }
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setError(t("driver.inscription.error_session"));
      setLoading(false);
      return;
    }
    const CGU_VERSION = "2026-08-24";
    const payload: Record<string, unknown> = {
      user_id: sess.session.user.id,
      kind,
      full_name: fullName,
      phone: phone ? (normalizePhone(phone) ?? null) : null,
      city: city || null,
      vehicle_kind: kind === "installer" ? null : vehicleKind,
      vehicle_plate: kind === "installer" ? null : vehiclePlate || null,
      cgu_version: CGU_VERSION,
      cgu_accepted_at: new Date().toISOString(),
    };
    if (hasCompany) {
      payload.siret = siret.siret;
      payload.siret_denomination = siret.denomination;
      payload.siret_verified_at = new Date().toISOString();
    }
    const { error } = await supabase.from("payee_profiles").insert(payload as never);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    void track("signup_completed", { role: "driver", kind });
    navigate({ to: "/driver/espace" });
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
          {t("driver.inscription.back")}
        </Link>

        {step === "auth" ? (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">
              {mode === "signup" ? t("driver.inscription.title_signup") : t("driver.inscription.title_signin")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup" ? t("driver.inscription.desc_signup") : t("driver.inscription.desc_signin")}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              <Input label={t("auth.email")} type="email" value={email} onChange={setEmail} required />
              <div>
                <Input
                  label={t("auth.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                />
                {mode === "signin" && (
                  <div className="mt-2 text-right">
                    <Link
                      to="/reset-password"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {t("driver.inscription.forgot_password")}
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
                {loading ? "..." : mode === "signup" ? t("driver.inscription.submit_signup") : t("driver.inscription.submit_signin")}
              </button>
            </form>
            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              {mode === "signup" ? t("driver.inscription.switch_to_signin") : t("driver.inscription.switch_to_signup")}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mt-4 mb-2">{t("driver.inscription.profile_title")}</h1>
            <SignedInBanner onSignedOut={() => setStep("auth")} />
            <p className="text-sm text-muted-foreground mb-6">
              {t("driver.inscription.profile_step")}
            </p>
            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("driver.inscription.role_label")}</label>
                <div className="grid gap-2">
                  {(
                    [
                      ["driver", t("driver.inscription.role_driver")],
                      ["installer", t("driver.inscription.role_installer")],
                      ["both", t("driver.inscription.role_both")],
                    ] as [Kind, string][]
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer ${kind === value ? "border-primary bg-primary/10" : "border-border"}`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === value}
                        onChange={() => setKind(value)}
                        className="h-4 w-4"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input label={t("driver.inscription.name_label")} value={fullName} onChange={setFullName} required />
              <Input label={t("driver.inscription.phone_label")} type="tel" value={phone} onChange={setPhone} />
              <Input label={t("driver.inscription.city_label")} value={city} onChange={setCity} />

              {kind !== "installer" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("driver.inscription.vehicle_type_label")}</label>
                    <select
                      value={vehicleKind}
                      onChange={(e) => setVehicleKind(e.target.value as VehicleKind)}
                      className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {VEHICLE_KIND_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {t(`vehicle_types.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input label={t("driver.inscription.plate_label")} value={vehiclePlate} onChange={setVehiclePlate} />
                </>
              )}

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCompany}
                  onChange={(e) => setHasCompany(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>{t("driver.inscription.company_checkbox")}</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedCGU}
                  onChange={(e) => setAcceptedCGU(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  {t("driver.inscription.cgu_accept")}{" "}
                  <Link to="/cgu" className="underline hover:text-foreground">
                    {t("driver.inscription.cgu_link_label")}
                  </Link>{" "}
                  {t("driver.inscription.cgu_before_strong")}
                  <strong>{t("driver.inscription.cgu_strong")}</strong>
                  {t("driver.inscription.cgu_after_strong")}
                </span>
              </label>
              {hasCompany && <SiretField value={siret} onChange={setSiret} />}

              {error && <Err msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? "..." : t("driver.inscription.submit_continue")}
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
