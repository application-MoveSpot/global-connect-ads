import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { getFleetOverview } from "@/lib/fleet.functions";
import { generateVehicleQrToken } from "@/lib/qr.functions";
import { LogoLink } from "@/components/LogoLink";
import { toast } from "sonner";

export const Route = createFileRoute("/proprietaire/flotte/qr")({
  head: () => ({ meta: [{ title: "QR codes véhicules — MoveSpot" }] }),
  component: QrPage,
});

function QrPage() {
  const fetchFleet = useServerFn(getFleetOverview);
  const genToken = useServerFn(generateVehicleQrToken);
  const { data, isLoading } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => fetchFleet(),
  });
  const [qrs, setQrs] = useState<Record<string, { url: string; img: string }>>({});

  useEffect(() => {
    if (!data?.vehicles?.length) return;
    (async () => {
      const next: Record<string, { url: string; img: string }> = {};
      for (const v of data.vehicles as any[]) {
        try {
          const r = await genToken({ data: { vehicleId: v.id, driverId: v.driver_id ?? null } });
          const url = `${window.location.origin}/chauffeur?t=${encodeURIComponent(r.token)}`;
          const img = await QRCode.toDataURL(url, { width: 320, margin: 1 });
          next[v.id] = { url, img };
        } catch {/* skip */}
      }
      setQrs(next);
    })();
  }, [data, genToken]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3">
            <Link to="/proprietaire/flotte" className="text-sm text-muted-foreground hover:text-foreground">← Retour flotte</Link>
            <button onClick={() => window.print()} className="text-sm text-primary hover:underline">🖨 Imprimer</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2 print:hidden">QR codes par véhicule</h1>
        <p className="text-sm text-muted-foreground mb-6 print:hidden">
          Imprimez et collez le QR dans la cabine. Le chauffeur le scanne avec son téléphone pour démarrer le suivi GPS — aucune installation requise. Les QR sont <strong>signés cryptographiquement</strong> (HMAC-SHA256) : impossible à falsifier.
        </p>

        {isLoading && <div className="text-muted-foreground">Chargement de la flotte...</div>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.vehicles ?? []).map((v: any) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4 print:break-inside-avoid">
              <div className="text-center">
                <div className="font-display font-bold text-lg">{v.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{v.type} · {v.format_publicitaire}</div>
                {qrs[v.id] ? (
                  <>
                    <img src={qrs[v.id].img} alt={`QR ${v.name}`} className="mx-auto" width={240} height={240} />
                    <div className="text-[10px] text-muted-foreground mt-2 break-all">{qrs[v.id].url}</div>
                    <button
                      onClick={() => copyLink(qrs[v.id].url)}
                      className="mt-2 text-xs text-primary hover:underline print:hidden"
                    >
                      Copier le lien
                    </button>
                  </>
                ) : (
                  <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Génération...</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && (data?.vehicles ?? []).length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Aucun véhicule approuvé. <Link to="/proprietaire/flotte/import" className="text-primary underline">Importer une flotte</Link>.
          </div>
        )}
      </main>
    </div>
  );
}
