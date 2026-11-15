import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { importVehiclesCSV } from "@/lib/fleet/fleet-import.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owner/flotte/import")({
  head: () => ({ meta: [{ title: "Import CSV de la flotte — MoveSpot" }] }),
  component: ImportPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const EXAMPLE = `name,type,format_publicitaire,price_per_day,city,license_plate,condition
Renault Master #12,Van utilitaire,Habillage total,120,Paris,AA-123-BB,bon
Citroën Jumpy #07,Van utilitaire,Bâche latérale,80,Lyon,CC-456-DD,bon
Vespa Livraison #03,Scooter,Top box arrière,25,Marseille,EE-789-FF,moyen`;

function downloadTemplate() {
  const blob = new Blob([EXAMPLE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele_import_vehicules.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvPreview(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines
    .slice(1, 11)
    .map((line) => line.split(",").map((c) => c.trim()));
  return { headers, rows };
}

const CONDITION_STYLES: Record<string, string> = {
  bon: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  moyen: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  mauvais: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function ImportPage() {
  const { t } = useTranslation();
  const importFn = useServerFn(importVehiclesCSV);
  const navigate = useNavigate();

  const COLUMN_LABELS: Record<string, string> = {
    name: t("owner.flotte.import.col_name"),
    type: t("owner.flotte.import.col_type"),
    format_publicitaire: t("owner.flotte.import.col_format_publicitaire"),
    price_per_day: t("owner.flotte.import.col_price_per_day"),
    city: t("owner.flotte.import.col_city"),
    license_plate: t("owner.flotte.import.col_license_plate"),
    condition: t("owner.flotte.import.col_condition"),
  };
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const preview = useMemo(() => (csv.trim() ? parseCsvPreview(csv) : null), [csv]);
  const [result, setResult] = useState<{
    inserted: number;
    errors: { line: number; error: string }[];
  } | null>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    setCsv(text);
  };

  const submit = async () => {
    if (!csv.trim()) {
      toast.error(t("owner.flotte.import.toast_csv_empty"));
      return;
    }
    setLoading(true);
    try {
      const r = await importFn({ data: { csv } });
      setResult(r);
      if (r.inserted > 0)
        toast.success(t("owner.flotte.import.toast_imported", { count: r.inserted }));
      if (r.errors.length === 0 && r.inserted > 0) {
        setTimeout(() => navigate({ to: "/owner/flotte" }), 1500);
      }
    } catch (e: any) {
      toast.error(e.message ?? t("owner.flotte.import.toast_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border light-band backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <LogoLink />
          <Link to="/owner/flotte" className="text-sm text-muted-foreground hover:text-foreground">
            {t("owner.flotte.import.back")}
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">{t("owner.flotte.import.title")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("owner.flotte.import.desc")} <strong>{t("owner.flotte.import.desc_status")}</strong>{" "}
          {t("owner.flotte.import.desc_suffix")}
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-2">{t("owner.flotte.import.format_title")}</h2>
          <p
            className="text-sm text-muted-foreground mb-3"
            dangerouslySetInnerHTML={{ __html: t("owner.flotte.import.format_desc") }}
          />
          <pre className="text-xs bg-secondary/40 p-3 rounded-lg overflow-x-auto">{EXAMPLE}</pre>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t("owner.flotte.import.download_template", { defaultValue: "Télécharger le modèle CSV" })}
            </button>
            <button
              type="button"
              onClick={() => setCsv(EXAMPLE)}
              className="text-xs text-primary hover:underline"
            >
              {t("owner.flotte.import.load_example")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("owner.flotte.import.file_label")}
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("owner.flotte.import.paste_label")}
            </label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              placeholder="name,type,format_publicitaire,price_per_day..."
              className="w-full font-mono text-xs rounded-lg bg-input border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {preview && preview.headers.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                {t("owner.flotte.import.preview_title", {
                  defaultValue: `Aperçu — ${preview.rows.length} ligne(s)`,
                  count: preview.rows.length,
                })}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-secondary/40">
                      {preview.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          {COLUMN_LABELS[h] ?? h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                            {preview.headers[j] === "condition" ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                  CONDITION_STYLES[cell] ?? "bg-secondary text-secondary-foreground",
                                )}
                              >
                                {cell.charAt(0).toUpperCase() + cell.slice(1)}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !csv.trim()}
            className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading
              ? t("owner.flotte.import.loading")
              : preview && preview.rows.length > 0
                ? t("owner.flotte.import.submit_count", {
                    defaultValue: `Importer ${preview.rows.length} véhicule(s)`,
                    count: preview.rows.length,
                  })
                : t("owner.flotte.import.submit")}
          </button>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-3">{t("owner.flotte.import.result_title")}</h2>
            <p
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: t("owner.flotte.import.result_inserted", { count: result.inserted }),
              }}
            />
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-destructive font-medium mb-2">
                  {t("owner.flotte.import.result_errors", { count: result.errors.length })}
                </p>
                <ul className="text-xs space-y-1 max-h-60 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="rounded bg-destructive/10 px-2 py-1">
                      {t("owner.flotte.import.result_line_error", { line: e.line, error: e.error })}
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
