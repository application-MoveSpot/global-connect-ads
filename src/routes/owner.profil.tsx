import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/owner/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OwnerProfilPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function OwnerProfilPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [siret, setSiret] = useState<string | null>(null);
  const [siretDenomination, setSiretDenomination] = useState<string | null>(null);
  const [siretVerifiedAt, setSiretVerifiedAt] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/owner/inscription" }); return; }

      const { data: prof } = await supabase
        .from("owner_profiles")
        .select("id, full_name, city, phone, company, bio, siret, siret_denomination, siret_verified_at")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();

      if (!prof) { navigate({ to: "/owner/inscription" }); return; }

      setProfileId(prof.id);
      setFullName(prof.full_name ?? "");
      setCity(prof.city ?? "");
      setPhone(prof.phone ?? "");
      setCompany(prof.company ?? "");
      setBio(prof.bio ?? "");
      setSiret(prof.siret);
      setSiretDenomination(prof.siret_denomination);
      setSiretVerifiedAt(prof.siret_verified_at);
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
      .from("owner_profiles")
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        bio: bio.trim() || null,
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
        <Link to="/owner" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {t("profile.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("profile.desc")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("profile.full_name")} value={fullName} onChange={setFullName} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("profile.city")} value={city} onChange={setCity} placeholder={t("profile.city_placeholder")} />
              <Field label={t("profile.phone")} value={phone} onChange={setPhone} type="tel" placeholder={t("profile.phone_placeholder")} />
            </div>
            <Field label={t("profile.company")} value={company} onChange={setCompany} placeholder={t("profile.company_placeholder")} />

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("profile.bio")}</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300}
                placeholder={t("profile.bio_placeholder")}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-xs text-muted-foreground mt-1">{t("profile.bio_hint")}</p>
            </div>

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
