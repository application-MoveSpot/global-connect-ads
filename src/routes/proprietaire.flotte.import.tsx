import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { importVehiclesCSV } from "@/lib/fleet/fleet-import.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/proprietaire/flotte/import")({
  head: () => ({ meta: [{ title: "Import CSV de la flotte — MoveSpot" }] }),
  component: ImportPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const EXAMPLE = `name,type,format_publicitaire,price_per_day,city,license_plate,condition
Renault Master #12,Van utilitaire,Habillage total,120,Paris,AA-123-BB,bon
Citroën Jumpy #07,Van utilitaire,Bâche latérale,80,Lyon,CC-456-DD,bon
Vespa Livraison #03,Scooter,Top box arrière,25,Marseille,EE-789-FF,moyen`;

function ImportPage() {
  const importFn = useServerFn(importVehiclesCSV);
  const navigate = useNavigate();
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: { line: number; error: string }[] } | null>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    setCsv(text);
  };

  const submit = async () => {
    if (!csv.trim()) {
      toast.error("CSV vide");
      return;
    }
    setLoading(true);
    try {
      const r = await importFn({ data: { csv } });
      setResult(r);
      if (r.inserted > 0) toast.success(`${r.inserted} véhicule(s) importé(s)`);
      if (r.errors.length === 0 && r.inserted > 0) {
        setTimeout(() => navigate({ to: "/proprietaire/flotte" }), 1500);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/proprietaire/flotte" className="text-sm text-muted-foreground hover:text-foreground">← Retour flotte</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Importer une flotte en CSV</h1>
        <p className="text-muted-foreground mb-6">
          Idéal pour ajouter rapidement 10, 50 ou 200 véhicules. Tous les véhicules importés sont en statut
          <strong> « En attente validation »</strong> jusqu'à modération.
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-2">Format attendu</h2>
          <p className="text-sm text-muted-foreground mb-3">Colonnes requises : <code>name, type, format_publicitaire, price_per_day</code>. Optionnelles : <code>city, license_plate, condition</code> (bon/moyen/mauvais).</p>
          <pre className="text-xs bg-secondary/40 p-3 rounded-lg overflow-x-auto">{EXAMPLE}</pre>
          <button
            type="button"
            onClick={() => setCsv(EXAMPLE)}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Charger cet exemple
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fichier CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ou collez le contenu</label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              placeholder="name,type,format_publicitaire,price_per_day..."
              className="w-full font-mono text-xs rounded-lg bg-input border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={submit}
            disabled={loading || !csv.trim()}
            className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Import en cours..." : "Importer"}
          </button>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-3">Résultat</h2>
            <p className="text-sm">✅ <strong>{result.inserted}</strong> véhicule(s) ajouté(s).</p>
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-destructive font-medium mb-2">{result.errors.length} ligne(s) ignorée(s) :</p>
                <ul className="text-xs space-y-1 max-h-60 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="rounded bg-destructive/10 px-2 py-1">
                      Ligne {e.line} : {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
