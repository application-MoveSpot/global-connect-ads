import { useState } from "react";

type Spot = {
  id: string;
  name: string;
  location: string;
  impressions: string;
  price: number;
  format: string;
  available: boolean;
};

const SPOTS: Spot[] = [
  { id: "1", name: "Station Vélo · République", location: "Paris 11e", impressions: "48K/jour", price: 120, format: "Écran 32\"", available: true },
  { id: "2", name: "Hub Scooter · Gare du Nord", location: "Paris 10e", impressions: "112K/jour", price: 280, format: "Habillage total", available: true },
  { id: "3", name: "Borne Auto · Times Square", location: "New York", impressions: "340K/jour", price: 890, format: "LED géant", available: true },
  { id: "4", name: "Station Shibuya Crossing", location: "Tokyo", impressions: "210K/jour", price: 620, format: "Écran panoramique", available: false },
  { id: "5", name: "Hub Marina Bay", location: "Singapore", impressions: "88K/jour", price: 340, format: "Digital 55\"", available: true },
  { id: "6", name: "Station Ipanema", location: "Rio de Janeiro", impressions: "64K/jour", price: 180, format: "Affiche dynamique", available: true },
];

export function AdSpots({ onSelect }: { onSelect: (spot: Spot) => void }) {
  const [filter, setFilter] = useState<"all" | "available">("available");
  const filtered = SPOTS.filter((s) => filter === "all" || s.available);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold">Exemples d'emplacements</h2>
          <p className="text-muted-foreground mt-2">Aperçu illustratif des futurs hubs de mobilité partagée.</p>
        </div>
        <div className="flex gap-2 rounded-full border border-border p-1 bg-card">
          <button
            onClick={() => setFilter("available")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "available" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Disponibles
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Tous
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((spot) => (
          <div
            key={spot.id}
            className="group rounded-2xl border border-border bg-gradient-card p-6 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between mb-4">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${spot.available ? "bg-signal/15 text-signal" : "bg-muted text-muted-foreground"}`}>
                {spot.available ? "● Disponible" : "Réservé"}
              </span>
              <span className="text-xs text-muted-foreground">{spot.format}</span>
            </div>
            <h3 className="font-display text-xl font-semibold mb-1">{spot.name}</h3>
            <p className="text-sm text-muted-foreground mb-5">{spot.location}</p>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Impressions</div>
                <div className="font-display font-semibold">{spot.impressions}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">À partir de</div>
                <div className="font-display text-2xl font-bold text-primary">{spot.price}€<span className="text-sm text-muted-foreground font-normal">/j</span></div>
              </div>
            </div>
            <button
              disabled={!spot.available}
              onClick={() => onSelect(spot)}
              className="mt-5 w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {spot.available ? "Réserver cet espace" : "Indisponible"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Spot };
