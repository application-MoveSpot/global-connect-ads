type Props = {
  zones?: string[] | null;
  waypoints?: string[] | null;
  pois?: string[] | null;
  impressionsPerDay?: number | null;
  days?: number | null;
};

export function RouteSummary({ zones, waypoints, pois, impressionsPerDay, days }: Props) {
  const hasAny =
    (zones && zones.length > 0) ||
    (waypoints && waypoints.length > 0) ||
    (pois && pois.length > 0) ||
    (impressionsPerDay && impressionsPerDay > 0);
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs mb-4 space-y-2">
      <div className="font-semibold text-foreground">🗺 Itinéraire demandé</div>
      {zones && zones.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">Zones ciblées</div>
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z, i) => (
              <span key={i} className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{z}</span>
            ))}
          </div>
        </div>
      )}
      {waypoints && waypoints.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">Étapes du parcours</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-foreground">
            {waypoints.map((w, i) => <li key={i}>{w}</li>)}
          </ol>
        </div>
      )}
      {pois && pois.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">Points d'intérêt à couvrir</div>
          <ul className="list-disc pl-4 space-y-0.5 text-foreground">
            {pois.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
