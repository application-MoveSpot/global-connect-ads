import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/provider/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderProfilPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const SERVICES_OPTIONS = [
  "pose_adhesif",
  "pose_covering",
  "pose_bache",
  "depose",
  "retouche",
  "audit_visuel",
] as const;

function ProviderProfilPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [coverageAreas, setCoverageAreas] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [pricingInfo, setPricingInfo] = useState("");

  const [poseLocationTypes, setPoseLocationTypes] = useState<string[]>([]);

  const [siret, setSiret] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) { navigate({ to: "/provider/inscription" }); return; }

      const { data: prof } = await supabase
        .from("provider_profiles")
        .select("user_id, full_name, company, email, phone, description, coverage_areas, services, pricing_info, siret, status, pose_location_types")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!prof) { navigate({ to: "/provider/inscription" }); return; }

      setProfileId(prof.user_id);
      setFullName(prof.full_name ?? "");
      setCompany(prof.company ?? "");
      setEmail(prof.email ?? "");
      setPhone(prof.phone ?? "");
      setDescription(prof.description ?? "");
      setCoverageAreas(Array.isArray(prof.coverage_areas) ? (prof.coverage_areas as string[]).join(", ") : "");
      setServices(Array.isArray(prof.services) ? (prof.services as string[]) : []);
      setPricingInfo(prof.pricing_info ?? "");
      setPoseLocationTypes(Array.isArray(prof.pose_location_types) ? prof.pose_location_types : []);
      setSiret(prof.siret);
      setStatus(prof.status);
      setPageLoading(false);
    })();
  }, [navigate]);

  const toggleService = (s: string) => {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const togglePoseType = (pt: string) => {
    setPoseLocationTypes((prev) => prev.includes(pt) ? prev.filter((x) => x !== pt) : [...prev, pt]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setError("");
    setSaved(false);
    setLoading(true);
    const { error: upErr } = await supabase
      .from("provider_profiles")
      .update({
        full_name: fullName.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        description: description.trim(),
        coverage_areas: coverageAreas ? coverageAreas.split(",").map((z) => z.trim()).filter(Boolean) : [],
        services,
        pricing_info: pricingInfo.trim() || null,
        pose_location_types: poseLocationTypes,
      })
      .eq("user_id", profileId);

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
        <Link to="/provider" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {t("profile.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("profile.desc")}</p>

          {status && (
            <div className={`mb-4 rounded-lg px-4 py-2.5 text-xs font-semibold ${
              status === "approved" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
              status === "pending" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
              "bg-destructive/15 text-destructive"
            }`}>
              {t(`provider.inscription.status_${status}`, { defaultValue: status })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("profile.full_name")} value={fullName} onChange={setFullName} required />
            <Field label={t("profile.company")} value={company} onChange={setCompany} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("profile.email")} value={email} onChange={setEmail} type="email" required />
              <Field label={t("profile.phone")} value={phone} onChange={setPhone} type="tel" placeholder={t("profile.phone_placeholder")} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("profile.description")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500}
                placeholder={t("profile.description_placeholder")}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <Field
              label={t("profile.coverage_areas")}
              value={coverageAreas}
              onChange={setCoverageAreas}
              placeholder={t("profile.coverage_areas_placeholder")}
            />

            <div>
              <label className="block text-sm font-medium mb-2">{t("profile.services")}</label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleService(s)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      services.includes(s)
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border bg-input hover:border-primary/40"
                    }`}>
                    {t(`provider.inscription.service_${s}`, { defaultValue: s })}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("profile.pose_location_types")}</label>
              <p className="text-xs text-muted-foreground mb-2">{t("profile.pose_location_types_hint")}</p>
              <div className="flex gap-2">
                {(["garage", "domicile"] as const).map((pt) => (
                  <button key={pt} type="button" onClick={() => togglePoseType(pt)}
                    className={`rounded-lg border px-4 py-2 text-sm transition flex items-center gap-1.5 ${
                      poseLocationTypes.includes(pt)
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border bg-input hover:border-primary/40"
                    }`}>
                    {pt === "garage" ? "🏪" : "🏠"} {t(`provider.dashboard.pose_type_${pt}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("profile.pricing_info")}</label>
              <textarea value={pricingInfo} onChange={(e) => setPricingInfo(e.target.value)} rows={2} maxLength={300}
                placeholder={t("profile.pricing_info_placeholder")}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {siret && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.siret_section")}</p>
                <p className="text-sm">{siret}</p>
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
