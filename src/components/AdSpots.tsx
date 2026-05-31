import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

type Spot = {
  id: string;
  vehicleId?: string;
  name: string;
  location: string;
  impressions: string;
  price: number;
  format: string;
  available: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  food_truck: "Food truck",
  van: "Van",
  taxi: "Taxi / VTC",
  scooter: "Scooter",
  voiture: "Voiture",
  autre: "Véhicule",
};

export function AdSpots({ onSelect }: { onSelect: (spot: Spot) => void }) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, name, type, format_publicitaire, price_per_day, zones, km_per_day")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      const mapped: Spot[] = (data ?? []).map((v) => ({
        id: v.id,
        vehicleId: v.id,
        name: `${TYPE_LABELS[v.type] ?? "Véhicule"} · ${v.name}`,
        location: (v.zones && v.zones.length > 0) ? v.zones.join(" · ") : "Zone à confirmer",
        impressions: v.km_per_day ? `${(v.km_per_day * 1000).toLocaleString("fr-FR")} impressions/jour` : "—",
        price: Number(v.price_per_day),
        format: v.format_publicitaire,
        available: true,
      }));
      setSpots(mapped);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold">Véhicules disponibles</h2>
          <p className="text-muted-foreground mt-2">Sélection de véhicules partenaires proposant des espaces publicitaires mobiles.</p>
        </div>
        <Link to="/devenir-partenaire" className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-secondary transition">
          Vous avez un véhicule ? →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Chargement...</div>
      ) : spots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="text-4xl mb-3">🚐</div>
          <h3 className="font-display text-2xl font-bold mb-2">La marketplace s'ouvre aux premiers partenaires</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">Soyez parmi les premiers propriétaires à proposer votre véhicule sur MoveSpot et bénéficiez d'une visibilité maximale auprès des annonceurs.</p>
          <Link to="/devenir-partenaire" className="inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            Devenir partenaire
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spots.map((spot) => (
            <div
              key={spot.id}
              className="group rounded-2xl border border-border bg-gradient-card p-6 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-signal/15 text-signal">● Disponible</span>
                <span className="text-xs text-muted-foreground">{spot.format}</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-1">{spot.name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{spot.location}</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Audience</div>
                  <div className="font-display font-semibold text-sm">{spot.impressions}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">À partir de</div>
                  <div className="font-display text-2xl font-bold text-primary">{spot.price}€<span className="text-sm text-muted-foreground font-normal">/j</span></div>
                </div>
              </div>
              <button
                onClick={() => onSelect(spot)}
                className="mt-5 w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition"
              >
                Réserver cet espace
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Spot };
