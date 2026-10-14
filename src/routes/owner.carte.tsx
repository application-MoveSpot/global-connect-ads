import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { getFleetOverview } from "@/lib/fleet/fleet.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/owner/carte")({
  head: () => ({
    meta: [
      { title: "Carte de visite — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CartePage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const PLATFORM_URL = "https://move-spot.com";

function CartePage() {
  const { t } = useTranslation();
  const fetchFleet = useServerFn(getFleetOverview);
  const { data } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => fetchFleet(),
  });

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const approvedCount = (data?.vehicles ?? []).filter((v: any) => v.status === "approved").length;
  const vehicleTypes = [
    ...new Set(
      (data?.vehicles ?? [])
        .filter((v: any) => v.status === "approved")
        .map((v: any) => v.type as string),
    ),
  ].slice(0, 3);

  useEffect(() => {
    QRCode.toDataURL(PLATFORM_URL, {
      width: 280,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3">
            <Link to="/owner" className="text-sm text-muted-foreground hover:text-foreground">
              {t("owner.carte.back")}
            </Link>
            <button onClick={() => window.print()} className="text-sm text-primary hover:underline">
              {t("owner.carte.print")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 print:p-0">
        <div className="print:hidden mb-6">
          <h1 className="font-display text-3xl font-bold mb-1">{t("owner.carte.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("owner.carte.desc")}</p>
        </div>

        {/* Card preview — matches print layout */}
        <div ref={cardRef} className="mx-auto print:mx-0" style={{ maxWidth: 680 }}>
          {/* Front of card */}
          <div
            className="rounded-2xl overflow-hidden shadow-xl print:rounded-none print:shadow-none"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e1b4b 100%)",
              aspectRatio: "1.75 / 1",
              position: "relative",
              padding: "40px 44px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Top accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                background: "#f97316",
              }}
            />

            {/* Header row */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ color: "#ffffff" }}>Move</span>
                  <span style={{ color: "#f97316" }}>Spot</span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    marginTop: 4,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {t("owner.carte.card_tagline")}
                </div>
              </div>

              {/* QR code */}
              <div style={{ textAlign: "center" }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR move-spot.com"
                    style={{ width: 88, height: 88, borderRadius: 8, display: "block" }}
                  />
                ) : (
                  <div style={{ width: 88, height: 88, background: "#1e293b", borderRadius: 8 }} />
                )}
                <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>move-spot.com</div>
              </div>
            </div>

            {/* Middle — fleet info */}
            <div style={{ color: "#e2e8f0", fontSize: 13.5, lineHeight: 1.7 }}>
              {approvedCount > 0 ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#ffffff", marginBottom: 2 }}>
                    {t("owner.carte.vehicle_count", { count: approvedCount })}
                  </div>
                  {vehicleTypes.length > 0 && (
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      {vehicleTypes
                        .map((type) => t(`vehicle_types.${type}` as never, { defaultValue: type }))
                        .join(" · ")}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{t("owner.carte.no_vehicles")}</div>
              )}
            </div>

            {/* Bottom row */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                  {t("owner.carte.card_fleet_role")}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{t("owner.carte.card_cta")}</div>
              </div>
              <div
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                  letterSpacing: "0.03em",
                }}
              >
                B2B · B2C
              </div>
            </div>

            {/* Bottom accent */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 5,
                background: "#f97316",
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div
          className="print:hidden mt-6 rounded-xl border border-border bg-card p-5 space-y-3 text-sm text-muted-foreground"
          style={{ maxWidth: 680, margin: "24px auto 0" }}
        >
          <p className="font-medium text-foreground">{t("owner.carte.how_title")}</p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>{t("owner.carte.how_1")}</li>
            <li dangerouslySetInnerHTML={{ __html: t("owner.carte.how_2") }} />
            <li>{t("owner.carte.how_3")}</li>
          </ul>
          <div className="flex gap-2 pt-1 flex-wrap">
            <Link
              to="/owner/flotte/qr"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              {t("owner.carte.qr_link")}
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          header, .print\\:hidden { display: none !important; }
          body { background: white; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
