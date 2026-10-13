import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/partner/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerProfilPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function PartnerProfilPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  const [siret, setSiret] = useState<string | null>(null);
  const [siretDenomination, setSiretDenomination] = useState<string | null>(null);
  const [siretVerifiedAt, setSiretVerifiedAt] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) { navigate({ to: "/partner/inscription" }); return; }

      const { data: prof } = await supabase
        .from("partner_profiles")
        .select("id, full_name, company, city, phone, email, description, siret, siret_denomination, siret_verified_at, referral_code")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!prof) { navigate({ to: "/partner/inscription" }); return; }

      setProfileId(prof.id);
      setFullName(prof.full_name ?? "");
      setCompany(prof.company ?? "");
      setCity(prof.city ?? "");
      setPhone(prof.phone ?? "");
      setEmail(prof.email ?? "");
      setDescription(prof.description ?? "");
      setSiret(prof.siret);
      setSiretDenomination(prof.siret_denomination);
      setSiretVerifiedAt(prof.siret_verified_at);
      setReferralCode(prof.referral_code);
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
      .from("partner_profiles")
      .update({
        full_name: fullName.trim(),
        company: company.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        description: description.trim() || null,
      })
      .eq("id", profileId);

    if (upErr) { setError(upErr.message); setLoading(false); return; }
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
        <div className="mb-4"><LogoLink /></div>
        <Link to="/partner" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {t("profile.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("profile.desc")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("profile.full_name")} value={fullName} onChange={setFullName} required />
            <Field label={t("profile.company")} value={company} onChange={setCompany} placeholder={t("profile.company_placeholder")} />
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("profile.city")} value={city} onChange={setCity} placeholder={t("profile.city_placeholder")} />
              <Field label={t("profile.phone")} value={phone} onChange={setPhone} type="tel" placeholder={t("profile.phone_placeholder")} />
            </div>
            <Field label={t("profile.email")} value={email} onChange={setEmail} type="email" placeholder={t("profile.email_placeholder")} />

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("profile.description")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500}
                placeholder={t("profile.description_placeholder")}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {referralCode && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.referral_code_label")}</p>
                <p className="text-sm font-mono tracking-wider">{referralCode}</p>
                <p className="text-xs text-muted-foreground">{t("profile.referral_code_hint")}</p>
              </div>
            )}

            {siret && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.siret_section")}</p>
                <p className="text-sm">{siret}{siretDenomination ? ` — ${siretDenomination}` : ""}</p>
                {siretVerifiedAt && (
                  <p className="text-xs text-muted-foreground">{t("profile.siret_verified")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("profile.siret_readonly_hint")}</p>
              </div>
            )}

            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
            {saved && <div className="rounded-lg bg-green-500/15 border border-green-500/40 p-3 text-sm text-green-700 dark:text-green-400">{t("profile.saved")}</div>}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              {loading ? t("profile.saving") : t("profile.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
