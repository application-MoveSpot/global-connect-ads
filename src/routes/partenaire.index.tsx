import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/partenaire/")({
  component: PartenaireDashboard,
});

type Profile = {
  id: string;
  full_name: string;
  company: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  referral_code: string | null;
  created_at: string;
};

function PartenaireDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/partenaire/inscription" });
        return;
      }
      setEmail(sess.session.user.email ?? "");
      const { data: p } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!p) {
        navigate({ to: "/partenaire/inscription" });
        return;
      }
      setProfile(p as Profile);
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{email}</span>
            <button onClick={handleSignOut} className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary">
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Espace partenaire</h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenue {profile?.full_name} — votre tableau de bord apporteur d'affaires MoveSpot.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Votre profil</h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Nom" value={profile?.full_name} />
            <Info label="Email" value={email} />
            <Info label="Entreprise" value={profile?.company || "—"} />
            <Info label="Téléphone" value={profile?.phone || "—"} />
            <Info label="Ville" value={profile?.city || "—"} />
            <Info label="Code de parrainage" value={profile?.referral_code || "À attribuer par MoveSpot"} />
          </dl>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-xl font-semibold mb-2">🚀 Apportez des annonceurs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Recommandez MoveSpot à vos contacts. Une commission vous est reversée pour chaque campagne lancée par un annonceur que vous avez apporté.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/annonceur/inscription" className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90">
              Inviter un annonceur
            </Link>
            <Link to="/devenir-partenaire" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
              Voir le programme
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold mb-2">Contact MoveSpot</h2>
          <p className="text-sm text-muted-foreground">
            Une question sur le programme partenaire, vos commissions ou un dossier en cours ?
            Écrivez à <a href="mailto:partenaires@move-spot.com" className="underline hover:text-foreground">partenaires@move-spot.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}
