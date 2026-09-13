import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { getFleetOverview } from "@/lib/fleet/fleet.functions";
import { generateVehicleQrToken } from "@/lib/qr/qr.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import { RefreshCw, Printer, Copy, Clock } from "lucide-react";

export const Route = createFileRoute("/proprietaire/flotte/qr")({
  head: () => ({ meta: [{ title: "QR codes véhicules — MoveSpot" }] }),
  component: QrPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const EXPIRY_OPTIONS = [
  { label: "Permanent (sticker)", value: null },
  { label: "1 mois", value: 30 },
  { label: "3 mois", value: 90 },
  { label: "6 mois", value: 180 },
  { label: "1 an", value: 365 },
];

type QrData = {
  url: string;
  img: string;
  issuedAt: number;
  expiresAt: number | null;
  licensePlate: string | null;
  vehicleType: string;
  vehicleFormat: string | null;
};

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function QrPage() {
  const fetchFleet = useServerFn(getFleetOverview);
  const genToken = useServerFn(generateVehicleQrToken);
  const { data, isLoading } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => fetchFleet(),
  });

  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [qrs, setQrs] = useState<Record<string, QrData>>({});
  const [generating, setGenerating] = useState(false);

  const generateAll = async () => {
    if (!data?.vehicles?.length) return;
    setGenerating(true);
    const next: Record<string, QrData> = {};
    for (const v of data.vehicles as any[]) {
      try {
        const r = await genToken({
          data: { vehicleId: v.id, driverId: v.driver_id ?? null, expiresInDays },
        });
        const url = `${window.location.origin}/chauffeur?t=${encodeURIComponent(r.token)}`;
        const img = await QRCode.toDataURL(url, {
          width: 400,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        next[v.id] = {
          url,
          img,
          issuedAt: r.issuedAt,
          expiresAt: r.expiresAt,
          licensePlate: r.licensePlate,
          vehicleType: r.vehicleType,
          vehicleFormat: r.vehicleFormat,
        };
      } catch { /* skip */ }
    }
    setQrs(next);
    setGenerating(false);
    toast.success(`${Object.keys(next).length} QR code${Object.keys(next).length > 1 ? "s" : ""} générés`);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  };

  const vehicles = (data?.vehicles ?? []) as any[];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header (masqué à l'impression) ── */}
      <header className="border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3 items-center">
            <Link to="/proprietaire/flotte" className="text-sm text-muted-foreground hover:text-foreground">
              ← Retour flotte
            </Link>
            <button
              onClick={() => window.print()}
              disabled={Object.keys(qrs).length === 0}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-40"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Options (masquées à l'impression) ── */}
        <div className="print:hidden mb-8">
          <h1 className="font-display text-3xl font-bold mb-1">QR codes véhicules</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Imprimez et collez le QR dans la cabine de chaque véhicule. Le chauffeur le scanne avec son téléphone pour démarrer le suivi GPS — aucune installation requise. Les QR sont <strong>signés cryptographiquement</strong> (HMAC-SHA256) : impossible à falsifier.
          </p>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" /> Durée de validité
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setExpiresInDays(opt.value)}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                      expiresInDays === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {expiresInDays && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Les QR générés expireront le {formatDate(Math.floor(Date.now() / 1000) + expiresInDays * 86400)}. Après cette date, le chauffeur verra une erreur au scan.
                </p>
              )}
              {!expiresInDays && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Les QR n'expireront jamais — idéal pour des stickers permanents dans la cabine.
                </p>
              )}
            </div>

            <button
              onClick={generateAll}
              disabled={generating || isLoading || !vehicles.length}
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Génération en cours…" : Object.keys(qrs).length > 0 ? "Régénérer tous les QR" : "Générer les QR codes"}
            </button>
          </div>
        </div>

        {isLoading && <div className="text-muted-foreground print:hidden">Chargement de la flotte...</div>}

        {!isLoading && vehicles.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground print:hidden">
            Aucun véhicule approuvé.{" "}
            <Link to="/proprietaire/flotte/import" className="text-primary underline">Importer une flotte</Link>.
          </div>
        )}

        {/* ── Grille de cartes QR ── */}
        {Object.keys(qrs).length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-8">
            {vehicles.map((v: any) => {
              const q = qrs[v.id];
              if (!q) return null;
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm print:border-slate-300 print:shadow-none print:break-inside-avoid"
                >
                  {/* En-tête de carte */}
                  <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold text-base leading-tight">{v.name}</div>
                      {q.licensePlate && (
                        <div className="font-mono text-xs tracking-widest text-slate-300 mt-0.5">{q.licensePlate}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">MoveSpot</div>
                      <div className="text-[10px] text-slate-400">{q.vehicleType}</div>
                    </div>
                  </div>

                  {/* QR code */}
                  <div className="flex justify-center py-5 bg-white">
                    <img src={q.img} alt={`QR ${v.name}`} width={200} height={200} />
                  </div>

                  {/* Méta + instructions */}
                  <div className="px-4 pb-4 space-y-3 bg-white dark:bg-slate-900">
                    {q.vehicleFormat && (
                      <div className="text-center">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">Format</span>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{q.vehicleFormat}</div>
                      </div>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Émis le</span>
                        <span>{formatDate(q.issuedAt)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Expire le</span>
                        <span className={q.expiresAt ? "font-medium text-amber-600" : "text-slate-400"}>
                          {q.expiresAt ? formatDate(q.expiresAt) : "Jamais"}
                        </span>
                      </div>
                    </div>

                    {/* Instructions pour le chauffeur */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3">
                      <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        📱 Mode d'emploi chauffeur
                      </p>
                      <ol className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 list-none">
                        <li>1. Ouvrez l'appareil photo de votre téléphone</li>
                        <li>2. Visez ce QR code</li>
                        <li>3. Appuyez sur le lien qui apparaît</li>
                        <li>4. Confirmez le véhicule et démarrez le GPS</li>
                      </ol>
                    </div>

                    {/* Actions (masquées à l'impression) */}
                    <div className="flex gap-2 print:hidden">
                      <button
                        onClick={() => copyLink(q.url)}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copier le lien
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pied de page d'impression ── */}
        <div className="hidden print:block mt-8 text-center text-[10px] text-slate-400">
          Généré par MoveSpot · movespot.fr · Ces QR sont signés cryptographiquement — toute modification les invalide.
        </div>
      </main>

      {/* ── CSS d'impression global ── */}
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
