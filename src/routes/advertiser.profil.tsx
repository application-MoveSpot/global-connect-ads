import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { ApiKeysManager } from "@/components/advertiser/ApiKeysManager";
import { ExternalApiKeysManager } from "@/components/advertiser/ExternalApiKeysManager";

export const Route = createFileRoute("/advertiser/profil")({
  head: () => ({
    meta: [{ title: "Mon profil — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdvertiserProfilPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function AdvertiserProfilPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");

  const [siret, setSiret] = useState<string | null>(null);
  const [siretDenomination, setSiretDenomination] = useState<string | null>(null);
  const [siretVerifiedAt, setSiretVerifiedAt] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }

      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select(
          "id, full_name, city, phone, company, address, siret, siret_denomination, siret_verified_at, account_type",
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!prof) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }

      setProfileId(prof.id);
      setFullName(prof.full_name ?? "");
      setCity(prof.city ?? "");
      setPhone(prof.phone ?? "");
      setCompany(prof.company ?? "");
      setAddress(prof.address ?? "");
      setSiret(prof.siret);
      setSiretDenomination(prof.siret_denomination);
      setSiretVerifiedAt(prof.siret_verified_at);
      setAccountType(prof.account_type);
      setPageLoading(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setError("");
    setSaved(false);
    setLoading(true);
    const { error: upErr } = await supabase
      .from("advertiser_profiles")
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        address: address.trim() || null,
      })
      .eq("id", profileId);

    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }
    setSaved(true);
    setLoading(false);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/advertiser"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("profile.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("profile.desc")}</p>

          {accountType && (
            <div className="mb-4 rounded-lg bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
              {t("profile.account_type_label")} :{" "}
              <span className="font-semibold">
                {t(`advertiser.inscription.account_type_${accountType}`)}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label={t("profile.full_name")}
              value={fullName}
              onChange={setFullName}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("profile.city")}
                value={city}
                onChange={setCity}
                placeholder={t("profile.city_placeholder")}
              />
              <Field
                label={t("profile.phone")}
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder={t("profile.phone_placeholder")}
              />
            </div>
            <Field
              label={t("profile.company")}
              value={company}
              onChange={setCompany}
              placeholder={t("profile.company_placeholder")}
            />
            <Field
              label={t("profile.address")}
              value={address}
              onChange={setAddress}
              placeholder={t("profile.address_placeholder")}
            />

            {siret && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("profile.siret_section")}
                </p>
                <p className="text-sm">
                  {siret}
                  {siretDenomination ? ` — ${siretDenomination}` : ""}
                </p>
                {siretVerifiedAt && (
                  <p className="text-xs text-muted-foreground">{t("profile.siret_verified")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("profile.siret_readonly_hint")}</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg bg-green-500/15 border border-green-500/40 p-3 text-sm text-green-700 dark:text-green-400">
                {t("profile.saved")}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading ? t("profile.saving") : t("profile.submit")}
            </button>
          </form>
        </div>

        <ApiKeysManager />
        <ExternalApiKeysManager />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
