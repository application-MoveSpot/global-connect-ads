import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Car, Navigation, Wrench, Users, TrendingUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_public/commencer")({
  head: () => ({
    meta: [
      { title: "Rejoindre MoveSpot — Choisissez votre profil" },
      { name: "description", content: "Annonceur, propriétaire de véhicule, chauffeur, poseur, partenaire ou commercial — créez votre compte MoveSpot en 2 minutes." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: CommencerPage,
});

const ROLES = [
  {
    key: "annonceur",
    icon: Megaphone,
    title: "Annonceur",
    subtitle: "Je veux diffuser ma publicité",
    desc: "Créez des campagnes géolocalisées sur des véhicules en mouvement. Payez au km² réel, prouvé par GPS.",
    cta: "Créer une campagne",
    href: "/annonceur/inscription",
    accent: "border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10",
    iconColor: "text-primary",
    badge: null,
  },
  {
    key: "proprietaire",
    icon: Car,
    title: "Propriétaire",
    subtitle: "J'ai un véhicule à valoriser",
    desc: "Louez l'espace publicitaire de votre flotte ou de votre véhicule personnel. 70 % des revenus vous revient.",
    cta: "Inscrire mon véhicule",
    href: "/proprietaire/inscription",
    accent: "border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
    iconColor: "text-emerald-500",
    badge: "70 % reversé",
  },
  {
    key: "chauffeur",
    icon: Navigation,
    title: "Chauffeur",
    subtitle: "Je conduis pour un propriétaire",
    desc: "Accédez à votre espace via QR code, suivez vos missions et transmettez les photos d'installation.",
    cta: "Accéder à mon espace",
    href: "/chauffeur/inscription",
    accent: "border-blue-500/40 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10",
    iconColor: "text-blue-500",
    badge: null,
  },
  {
    key: "prestataire",
    icon: Wrench,
    title: "Prestataire",
    subtitle: "Je pose, produis ou crée des contenus pub",
    desc: "Pose de covering, production vidéo publicitaire, création graphique — proposez vos services aux annonceurs MoveSpot.",
    cta: "Proposer mes services",
    href: "/prestataire/inscription",
    accent: "border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
    iconColor: "text-amber-500",
    badge: null,
  },
  {
    key: "partenaire",
    icon: Users,
    title: "Partenaire",
    subtitle: "Je rejoins le réseau MoveSpot",
    desc: "Intégrez l'écosystème MoveSpot en tant que partenaire réseau et développez votre activité.",
    cta: "Rejoindre le réseau",
    href: "/partenaire/inscription",
    accent: "border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10",
    iconColor: "text-violet-500",
    badge: null,
  },
  {
    key: "commercial",
    icon: TrendingUp,
    title: "Commercial",
    subtitle: "J'apporte des clients à MoveSpot",
    desc: "Parrainez des annonceurs et percevez 10 % de commission sur chaque campagne réalisée via votre lien.",
    cta: "Devenir apporteur",
    href: "/commercial/inscription",
    accent: "border-rose-500/40 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10",
    iconColor: "text-rose-500",
    badge: "10 % commission",
  },
] as const;

function CommencerPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-primary mb-3 font-semibold">
            Inscription gratuite · 2 minutes
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Je suis…
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Choisissez votre profil pour accéder à l'espace qui vous correspond.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role) => {
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
          Déjà inscrit ?{" "}
          <Link to="/annonceur" className="underline hover:text-foreground transition">
            Annonceur
          </Link>
          {" · "}
          <Link to="/proprietaire" className="underline hover:text-foreground transition">
            Propriétaire
          </Link>
          {" · "}
          <Link to="/chauffeur" className="underline hover:text-foreground transition">
            Chauffeur
          </Link>
          {" · "}
          <Link to="/prestataire" className="underline hover:text-foreground transition">
            Prestataire
          </Link>
        </p>
      </main>
    </div>
  );
}
