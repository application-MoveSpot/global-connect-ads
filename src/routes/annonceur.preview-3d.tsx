import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { VehicleMockup3D, AD_FORMATS } from "@/components/advertiser/VehicleMockup3D";
import type { VehicleKey, AdFormat } from "@/components/advertiser/VehicleMockup3D";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/annonceur/preview-3d")({
  head: () => ({
    meta: [
      { title: "Aperçu publicitaire gratuit — MoveSpot" },
      {
        name: "description",
        content:
          "Visualisez gratuitement votre logo ou visuel sur un véhicule publicitaire en 3D. Aucun compte requis.",
      },
    ],
  }),
  component: PreviewPublicPage,
});

const VEHICLES: { key: VehicleKey; label: string; icon: string }[] = [
  { key: "voiture", label: "Voiture", icon: "🚗" },
  { key: "van", label: "Van", icon: "🚐" },
  { key: "taxi", label: "Taxi / VTC", icon: "🚕" },
  { key: "scooter", label: "Scooter", icon: "🛵" },
  { key: "food_truck", label: "Food Truck", icon: "🚚" },
  { key: "velo_cargo", label: "Vélo cargo", icon: "🚲" },
];

const PRESET_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c",
  "#9333ea", "#0891b2", "#000000", "#ffffff",
];

function PreviewPublicPage() {
  const [vehicleKey, setVehicleKey] = useState<VehicleKey>("voiture");
  const [adFormat, setAdFormat] = useState<AdFormat>("covering_total");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const availableFormats = AD_FORMATS.filter((f) => {
    if (vehicleKey === "scooter" || vehicleKey === "velo_cargo")
      return f.v === "stickers" || f.v === "affiche";
    if (vehicleKey === "food_truck") return f.v !== "boxled";
    return f.v !== "boxled";
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Lancer ma campagne →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Visualisez votre pub en 3D
          </h1>
          <p className="text-muted-foreground">
            Choisissez un véhicule, déposez votre logo — aucun compte requis.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Mockup 3D */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <VehicleMockup3D
              vehicleTypes={[vehicleKey]}
              adFormat={adFormat}
              brandColor={brandColor}
              logoUrl={logoUrl}
            />
            <p className="text-center text-xs text-muted-foreground mt-3">
              Glisser pour faire pivoter · Simulation non contractuelle
            </p>
          </div>

          {/* Panneau de contrôle */}
          <div className="space-y-6">
            {/* Véhicule */}
            <div>
              <p className="text-sm font-semibold mb-2">Type de véhicule</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => {
                      setVehicleKey(v.key);
                      // Reset format incompatible avec le nouveau type
                      const restrictedTypes = ["scooter", "velo_cargo"];
                      if (restrictedTypes.includes(v.key) && adFormat !== "stickers" && adFormat !== "affiche") {
                        setAdFormat("stickers");
                      }
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      vehicleKey === v.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary/50"
                    }`}
                  >
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format publicitaire */}
            <div>
              <p className="text-sm font-semibold mb-2">Format publicitaire</p>
              <div className="space-y-1.5">
                {availableFormats.map((f) => (
                  <button
                    key={f.v}
                    onClick={() => setAdFormat(f.v)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                      adFormat === f.v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary/50"
                    }`}
                  >
                    <span className="font-medium">{f.l}</span>
                    <span className="text-xs text-muted-foreground">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de marque */}
            <div>
              <p className="text-sm font-semibold mb-2">Couleur principale</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrandColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      brandColor === c ? "border-primary scale-110" : "border-border"
                    }`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-8 w-16 rounded cursor-pointer border border-border"
              />
            </div>

            {/* Logo */}
            <div>
              <p className="text-sm font-semibold mb-2">Votre logo (optionnel)</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition"
              >
                {logoUrl ? "✓ Logo chargé — cliquer pour changer" : "📁 Déposer ou cliquer pour charger"}
              </button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="mt-1 text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Supprimer le logo
                </button>
              )}
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm font-semibold mb-1">Prêt à lancer ?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Dès 49 € · sans abonnement · 7 jours de visibilité
              </p>
              <Link
                to="/annonceur/inscription"
                className="block w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Créer ma campagne →
              </Link>
              <p className="text-[10px] text-muted-foreground mt-2">
                Aucun compte requis pour prévisualiser
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
