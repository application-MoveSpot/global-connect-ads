import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Car, Navigation, Wrench, Users, TrendingUp, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";

export const Route = createFileRoute("/_public/commencer")({
  head: () => ({
    meta: [
      { title: "Get started with MoveSpot | Rejoindre MoveSpot — Choisissez votre profil" },
      { name: "description", content: "Advertiser, vehicle owner, driver, installer, partner or sales rep — create your MoveSpot account in 2 minutes. Annonceur, propriétaire de véhicule, driver, poseur, partner ou commercial — créez votre compte MoveSpot en 2 minutes." },
      { name: "robots", content: "index,follow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/commencer" },
      ...hreflangLinks("/commencer"),
    ],
  }),
  component: CommencerPage,
});

const ROLES = {
  fr: [
    {
      key: "advertiser",
      icon: Megaphone,
      title: "Annonceur",
      subtitle: "Je veux diffuser ma publicité",
      desc: "Créez des campagnes géolocalisées sur des véhicules en mouvement. Payez au km² réel, prouvé par GPS.",
      cta: "Créer une campagne",
      href: "/advertiser/inscription",
      accent: "border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10",
      iconColor: "text-primary",
      badge: null,
    },
    {
      key: "owner",
      icon: Car,
      title: "Propriétaire",
      subtitle: "J'ai un véhicule à valoriser",
      desc: "Louez l'espace publicitaire de votre flotte ou de votre véhicule personnel. 70 % des revenus vous revient.",
      cta: "Inscrire mon véhicule",
      href: "/owner/inscription",
      accent: "border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
      iconColor: "text-emerald-500",
      badge: "70 % reversé",
    },
    {
      key: "driver",
      icon: Navigation,
      title: "Chauffeur",
      subtitle: "Je conduis pour un propriétaire",
      desc: "Accédez à votre espace via QR code, suivez vos missions et transmettez les photos d'installation.",
      cta: "Accéder à mon espace",
      href: "/driver/inscription",
      accent: "border-blue-500/40 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10",
      iconColor: "text-blue-500",
      badge: null,
    },
    {
      key: "provider",
      icon: Wrench,
      title: "Prestataire",
      subtitle: "Je pose, produis ou crée des contenus pub",
      desc: "Pose de covering, production vidéo publicitaire, création graphique — proposez vos services aux advertisers MoveSpot.",
      cta: "Proposer mes services",
      href: "/provider/inscription",
      accent: "border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
      iconColor: "text-amber-500",
      badge: null,
    },
    {
      key: "partner",
      icon: Users,
      title: "Partenaire",
      subtitle: "Je rejoins le réseau MoveSpot",
      desc: "Intégrez l'écosystème MoveSpot en tant que partner réseau et développez votre activité.",
      cta: "Rejoindre le réseau",
      href: "/partner/inscription",
      accent: "border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10",
      iconColor: "text-violet-500",
      badge: null,
    },
    {
      key: "commercial",
      icon: TrendingUp,
      title: "Commercial",
      subtitle: "J'apporte des clients à MoveSpot",
      desc: "Parrainez des advertisers et percevez 10 % de commission sur chaque campagne réalisée via votre lien.",
      cta: "Devenir apporteur",
      href: "/commercial/inscription",
      accent: "border-rose-500/40 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10",
      iconColor: "text-rose-500",
      badge: "10 % commission",
    },
  ],
  en: [
    {
      key: "advertiser",
      icon: Megaphone,
      title: "Advertiser",
      subtitle: "I want to run ads",
      desc: "Launch geolocated campaigns on moving vehicles. Pay per real km², verified by GPS.",
      cta: "Create a campaign",
      href: "/advertiser/inscription",
      accent: "border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10",
      iconColor: "text-primary",
      badge: null,
    },
    {
      key: "owner",
      icon: Car,
      title: "Vehicle Owner",
      subtitle: "I have a vehicle to monetise",
      desc: "Rent out the advertising space on your fleet or personal vehicle. You keep 70% of the revenue.",
      cta: "Register my vehicle",
      href: "/owner/inscription",
      accent: "border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
      iconColor: "text-emerald-500",
      badge: "70% paid out",
    },
    {
      key: "driver",
      icon: Navigation,
      title: "Driver",
      subtitle: "I drive for an owner",
      desc: "Access your space via QR code, track your missions and upload installation photos.",
      cta: "Access my space",
      href: "/driver/inscription",
      accent: "border-blue-500/40 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10",
      iconColor: "text-blue-500",
      badge: null,
    },
    {
      key: "provider",
      icon: Wrench,
      title: "Installer",
      subtitle: "I install, produce or create ad content",
      desc: "Vehicle wrap installation, video production, graphic design — offer your services to MoveSpot advertisers.",
      cta: "Offer my services",
      href: "/provider/inscription",
      accent: "border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
      iconColor: "text-amber-500",
      badge: null,
    },
    {
      key: "partner",
      icon: Users,
      title: "Partner",
      subtitle: "I join the MoveSpot network",
      desc: "Join the MoveSpot ecosystem as a network partner and grow your business.",
      cta: "Join the network",
      href: "/partner/inscription",
      accent: "border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10",
      iconColor: "text-violet-500",
      badge: null,
    },
    {
      key: "commercial",
      icon: TrendingUp,
      title: "Sales Rep",
      subtitle: "I bring clients to MoveSpot",
      desc: "Refer advertisers and earn 10% commission on every campaign run through your link.",
      cta: "Become a referrer",
      href: "/commercial/inscription",
      accent: "border-rose-500/40 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10",
      iconColor: "text-rose-500",
      badge: "10% commission",
    },
  ],
} as const;

const CONTENT = {
  fr: {
    eyebrow: "Inscription gratuite · 2 minutes",
    h1: "Je suis…",
    desc: "Choisissez votre profil pour accéder à l'espace qui vous correspond.",
    already: "Déjà inscrit ?",
  },
  en: {
    eyebrow: "Free sign-up · 2 minutes",
    h1: "I am…",
    desc: "Choose your profile to access the right space for you.",
    already: "Already registered?",
  },
};

function CommencerPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "fr";
  const roles = ROLES[lang];
  const c = CONTENT[lang];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-primary mb-3 font-semibold">
            {c.eyebrow}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            {c.h1}
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            {c.desc}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.key}
                to={role.href}
                className={`group relative rounded-2xl border p-6 transition-all duration-200 flex flex-col gap-3 ${role.accent}`}
              >
                {role.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-background border border-border rounded-full px-2 py-0.5 text-muted-foreground">
                    {role.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center ${role.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg leading-tight">{role.title}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{role.subtitle}</p>
                </div>
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                  {role.desc}
                </p>
                <div className={`flex items-center gap-1.5 text-sm font-semibold mt-1 ${role.iconColor}`}>
                  {role.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          {c.already}{" "}
          <Link to="/advertiser" className="underline hover:text-foreground transition">
            {lang === "en" ? "Advertiser" : "Annonceur"}
          </Link>
          {" · "}
          <Link to="/owner" className="underline hover:text-foreground transition">
            {lang === "en" ? "Owner" : "Propriétaire"}
          </Link>
          {" · "}
          <Link to="/driver" className="underline hover:text-foreground transition">
            {lang === "en" ? "Driver" : "Chauffeur"}
          </Link>
          {" · "}
          <Link to="/provider" className="underline hover:text-foreground transition">
            {lang === "en" ? "Installer" : "Prestataire"}
          </Link>
        </p>
      </main>
    </div>
  );
}
