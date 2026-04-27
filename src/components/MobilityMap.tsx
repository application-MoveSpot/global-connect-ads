import { useEffect, useState } from "react";

type Hub = {
  id: string;
  city: string;
  country: string;
  flag: string;
  x: number;
  y: number;
  vehicles: number;
  status: "high" | "medium" | "low";
};

const INITIAL_HUBS: Hub[] = [
  { id: "par", city: "Paris", country: "FR", flag: "🇫🇷", x: 48, y: 32, vehicles: 1243, status: "high" },
  { id: "nyc", city: "New York", country: "US", flag: "🇺🇸", x: 24, y: 38, vehicles: 2180, status: "high" },
  { id: "tok", city: "Tokyo", country: "JP", flag: "🇯🇵", x: 84, y: 40, vehicles: 1876, status: "high" },
  { id: "dub", city: "Dubai", country: "AE", flag: "🇦🇪", x: 62, y: 48, vehicles: 534, status: "medium" },
  { id: "sao", city: "São Paulo", country: "BR", flag: "🇧🇷", x: 32, y: 68, vehicles: 412, status: "medium" },
  { id: "sin", city: "Singapore", country: "SG", flag: "🇸🇬", x: 78, y: 58, vehicles: 689, status: "medium" },
  { id: "lag", city: "Lagos", country: "NG", flag: "🇳🇬", x: 50, y: 56, vehicles: 187, status: "low" },
  { id: "syd", city: "Sydney", country: "AU", flag: "🇦🇺", x: 88, y: 74, vehicles: 298, status: "low" },
];

const statusColor = {
  high: "bg-signal",
  medium: "bg-warning",
  low: "bg-destructive",
};

export function MobilityMap() {
  const [hubs, setHubs] = useState(INITIAL_HUBS);
  const [selected, setSelected] = useState<Hub>(INITIAL_HUBS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHubs((prev) =>
        prev.map((h) => ({
          ...h,
          vehicles: Math.max(50, h.vehicles + Math.floor((Math.random() - 0.5) * 60)),
        })),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="relative aspect-[16/9] rounded-2xl border border-border bg-gradient-card grid-pattern overflow-hidden shadow-elevated">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        {hubs.map((hub) => (
          <button
            key={hub.id}
            onClick={() => setSelected(hub)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
          >
            <div className="relative">
              <div className={`pulse-dot relative h-3 w-3 rounded-full ${statusColor[hub.status]}`} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded-md border border-border">
              {hub.flag} {hub.city}
            </div>
          </button>
        ))}
        <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-signal" /> Haute</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Moyenne</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" /> Faible</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 flex flex-col gap-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Hub sélectionné</div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{selected.flag}</span>
          <div>
            <div className="font-display text-2xl font-semibold">{selected.city}</div>
            <div className="text-sm text-muted-foreground">{selected.country}</div>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Véhicules disponibles</div>
          <div className="font-display text-4xl font-bold tabular-nums text-primary">
            {hubs.find((h) => h.id === selected.id)?.vehicles.toLocaleString("fr-FR")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Mis à jour en temps réel</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <Stat label="Vélos" value="42%" />
          <Stat label="Scooters" value="31%" />
          <Stat label="Autos" value="27%" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3 text-center">
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
