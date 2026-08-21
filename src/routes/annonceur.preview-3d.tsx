import { createFileRoute, Link } from "@tanstack/react-router";
import { BackpackLCD3DPreview } from "@/components/advertiser/BackpackLCD3DPreview";
import { LogoLink } from "@/components/app/LogoLink";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/annonceur/preview-3d")({
  head: () => ({
    meta: [
      { title: "Prévisualisation 3D — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Preview3DPage,
});

function Preview3DPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LogoLink />
            <div className="hidden sm:block w-px h-5 bg-border" />
            <Link
              to="/annonceur"
              className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Mon espace
            </Link>
          </div>
          <span className="text-sm font-semibold text-foreground">
            Prévisualisation 3D · Sac à dos LCD
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">Prévisualisation 3D 360°</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Visualisez en temps réel votre publicité sur le sac à dos LCD. Chargez votre vidéo ou
            image pour l'appliquer sur l'écran.
          </p>
        </div>

        <BackpackLCD3DPreview />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl mb-1.5">📺</div>
            <div className="font-semibold mb-1">Écran LCD haute luminosité</div>
            <div className="text-xs text-muted-foreground">
              Écran embarqué visible de jour comme de nuit, idéal pour les zones à fort trafic.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl mb-1.5">🎒</div>
            <div className="font-semibold mb-1">Porteur mobile & ciblé</div>
            <div className="text-xs text-muted-foreground">
              Le porteur se déplace dans vos zones cibles aux heures de pointe pour maximiser l'impact.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl mb-1.5">📐</div>
            <div className="font-semibold mb-1">Format recommandé</div>
            <div className="text-xs text-muted-foreground">
              Ratio 9:13 (portrait), résolution minimale 540×780 px. MP4 ≤ 30 s pour les vidéos.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/annonceur/briefs/nouveau"
            className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold hover:bg-primary/90 transition"
          >
            Créer un brief avec ce support →
          </Link>
        </div>
      </main>
    </div>
  );
}
