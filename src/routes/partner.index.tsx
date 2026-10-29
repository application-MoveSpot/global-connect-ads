import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { PartnerSubscriptionCard } from "@/components/partner/PartnerSubscriptionCard";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/partner/")({
  head: () => ({
    meta: [{ title: "Espace partner — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PartnerDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type PartnerProfile = {
  id: string;
  user_id: string;
  company: string;
  full_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  status: string;
  admin_notes: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_period_end: string | null;
};

function PartnerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/partner/inscription" });
      return;
    }
    const { data: p, error: profileError } = await supabase
      .from("partner_profiles")
      .select(
        "id, user_id, company, full_name, email, phone, website, description, status, admin_notes, stripe_subscription_status, stripe_subscription_period_end",
      )
      .eq("user_id", session.user.id)
      .maybeSingle();
    // On query error don't redirect — a network blip would cause a loop between
    // /partner and /partner/inscription if both pages navigate on any null result.
    if (profileError) {
      setLoading(false);
      return;
    }
    if (!p) {
      navigate({ to: "/partner/inscription" });
      return;
    }
    setProfile(p as unknown as PartnerProfile);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile.company}
            </span>
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram MoveSpot"
              className="rounded-full p-2 hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <Link
              to="/partner/profil"
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("profile.title")}
            </Link>
            <Link
              to="/parametres"
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("common.settings")}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("partner.dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("partner.dashboard.welcome", { name: profile.full_name })}
            </p>
          </div>
          <StatusBadge status={profile.status} />
        </div>

        {profile.status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            {t("partner.dashboard.pending_notice")}
          </div>
        )}
        {profile.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {t("partner.dashboard.rejected_notice")}
            {profile.admin_notes && (
              <span>
                {" "}
                {t("common.reason_label")} {profile.admin_notes}
              </span>
            )}
          </div>
        )}

        <PartnerSubscriptionCard
          subscriptionStatus={profile.stripe_subscription_status}
          subscriptionPeriodEnd={profile.stripe_subscription_period_end}
          onSuccess={load}
        />

        {/* Referral link */}
        {profile.status === "approved" && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-1">
              {t("partner.dashboard.referral_link_title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("partner.dashboard.referral_link_body")}
            </p>
            <ReferralLinkBox partnerId={profile.id} />
            <p className="mt-3 text-xs text-muted-foreground">
              {t("partner.dashboard.referral_link_warning")}
            </p>
          </section>
        )}

        {/* How it works */}
        {profile.status === "approved" && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-4">
              {t("partner.dashboard.how_it_works_title")}
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-none">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  1
                </span>
                <span>{t("partner.dashboard.step1")}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  2
                </span>
                <span>{t("partner.dashboard.step2")}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  3
                </span>
                <span>{t("partner.dashboard.step3")}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  4
                </span>
                <span>{t("partner.dashboard.step4")}</span>
              </li>
            </ol>
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
              <span className="font-semibold text-primary">
                {t("partner.dashboard.commission_label")}
              </span>{" "}
              <span className="text-muted-foreground">
                {t("partner.dashboard.commission_value")}
              </span>
            </div>
          </section>
        )}

        {/* Resources */}
        {profile.status === "approved" && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-4">
              {t("partner.dashboard.resources_title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("partner.dashboard.resources_subtitle")}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <ResourceCard
                icon="📄"
                title={t("partner.dashboard.resource1_title")}
                description={t("partner.dashboard.resource1_desc")}
                href="/kit"
              />
              <ResourceCard
                icon="📊"
                title={t("partner.dashboard.resource2_title")}
                description={t("partner.dashboard.resource2_desc")}
                href="/tarifs"
              />
              <ResourceCard
                icon="🖼️"
                title={t("partner.dashboard.resource3_title")}
                description={t("partner.dashboard.resource3_desc")}
                href="/kit"
              />
              <ResourceCard
                icon="📋"
                title={t("partner.dashboard.resource4_title")}
                description={t("partner.dashboard.resource4_desc")}
                href="mailto:partners@move-spot.com?subject=FAQ%20partner"
              />
            </div>
          </section>
        )}

        {/* Contact */}
        {profile.status === "approved" && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold mb-2">
              {t("partner.dashboard.contact_title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("partner.dashboard.contact_body")}
            </p>
            <a
              href="mailto:partners@move-spot.com"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              {t("partner.dashboard.contact_btn")}
            </a>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold mb-4">
            {t("partner.dashboard.profile_title")}
          </h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label={t("common.company")} value={profile.company} />
            <Row label={t("common.manager")} value={profile.full_name} />
            <Row label={t("auth.email")} value={profile.email} />
            {profile.phone && <Row label={t("common.phone")} value={profile.phone} />}
            {profile.website && <Row label={t("common.website")} value={profile.website} />}
          </dl>
          {profile.description && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("common.description")}
              </div>
              <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
            </div>
          )}
          <div className="mt-4">
            <Link
              to="/partner/inscription"
              className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary"
            >
              {t("partner.dashboard.edit_profile")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0">{label} :</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const m: Record<string, { l: string; c: string }> = {
    pending: {
      l: t("partner.dashboard.status_pending"),
      c: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    approved: { l: t("partner.dashboard.status_approved"), c: "bg-signal/20 text-signal" },
    rejected: {
      l: t("partner.dashboard.status_rejected"),
      c: "bg-destructive/15 text-destructive",
    },
    suspended: { l: t("partner.dashboard.status_suspended"), c: "bg-secondary" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function ReferralLinkBox({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation();
  const url = `https://move-spot.com/?ref=${partnerId}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("partner.dashboard.link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("partner.dashboard.copy_failed"));
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-3">
      <span className="flex-1 min-w-0 text-sm font-mono text-muted-foreground truncate">{url}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
      >
        {copied ? `✅ ${t("partner.dashboard.copied")}` : t("common.copy")}
      </button>
    </div>
  );
}

function ResourceCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition group"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold group-hover:text-primary transition">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </a>
  );
}
