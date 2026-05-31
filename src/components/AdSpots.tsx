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
  { id: "1", name: "Food Truck · Le Bistrot Roulant", location: "Paris 11e · Bastille → République", impressions: "32K/jour", price: 140, format: "Habillage latéral 4m²", available: true },
  { id: "2", name: "Van de livraison · ExpressCo", location: "Paris intra-muros", impressions: "85K/jour", price: 220, format: "Habillage total véhicule", available: true },
  { id: "3", name: "Flotte Taxi · 12 véhicules", location: "Paris & petite couronne", impressions: "180K/jour", price: 480, format: "Toit lumineux + portières", available: true },
  { id: "4", name: "Scooter livraison · Pack 20", location: "Lyon centre", impressions: "95K/jour", price: 260, format: "Top-case publicitaire", available: false },
  { id: "5", name: "Food Truck · Tacos & Co", location: "Marseille Vieux-Port", impressions: "28K/jour", price: 120, format: "Bâche arrière 3m²", available: true },
  { id: "6", name: "Van événementiel · NomadAd", location: "Île-de-France", impressions: "55K/jour", price: 320, format: "Écran LED extérieur", available: true },
];

export function AdSpots({ onSelect }: { onSelect: (spot: Spot) => void }) {
  const [filter, setFilter] = useState<"all" | "available">("available");
  const filtered = SPOTS.filter((s) => filter === "all" || s.available);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold">Véhicules disponibles</h2>
          <p className="text-muted-foreground mt-2">Aperçu illustratif des véhicules proposant des espaces publicitaires mobiles.</p>
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
