import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { verifyDriverToken, getVehicleActiveCampaignVideo } from "@/lib/qr/qr.functions";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/chauffeur/ecran")({
  head: () => ({
    meta: [
      { title: "Écran publicitaire — MoveSpot" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  component: ScreenPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Campaign = {
  id: string;
  company: string;
  spotName: string;
  signedUrls: string[];
  dailyStart: string | null;
  dailyEnd: string | null;
};

type Vehicle = { id: string; name: string; type: string; format: string | null };

function isWithinDailyWindow(start: string | null, end: string | null): boolean {
  if (!start || !end) return true;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= start && hhmm <= end;
}

function ScreenPage() {
  const { t: tokenParam } = Route.useSearch();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const verify = useServerFn(verifyDriverToken);
  const fetchVideo = useServerFn(getVehicleActiveCampaignVideo);

  const [phase, setPhase] = useState<"verifying" | "ready" | "invalid">("verifying");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [inWindow, setInWindow] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tokenRef = useRef<string>(tokenParam);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCampaign = useCallback(async (tok: string) => {
    try {
      const res = await fetchVideo({ data: { token: tok } });
      if (res.ok) {
        setCampaign(res.campaign ?? null);
        setMediaIndex(0);
        if (res.campaign) {
          setInWindow(isWithinDailyWindow(res.campaign.dailyStart, res.campaign.dailyEnd));
        }
      }
    } catch {
      // keep previous campaign on transient error
    }
    // Re-check campaign every 30 min
    refreshTimerRef.current = setTimeout(() => loadCampaign(tok), 30 * 60 * 1000);
  }, [fetchVideo]);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("movespot_driver_token") : null;
    const tok = tokenParam || stored || "";
    if (!tok) { setPhase("invalid"); setError(t("chauffeur.ecran.no_token")); return; }
    tokenRef.current = tok;

    verify({ data: { token: tok } }).then((r: Awaited<ReturnType<typeof verify>>) => {
      if (!r.ok) { setPhase("invalid"); setError(r.error); return; }
      setVehicle(r.vehicle as Vehicle);
      setPhase("ready");
      try { localStorage.setItem("movespot_driver_token", tok); } catch {}
      loadCampaign(tok);
    }).catch(() => { setPhase("invalid"); setError(t("chauffeur.ecran.error_verify")); });

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [tokenParam, verify, loadCampaign, t]);

  // Check daily window every minute
  useEffect(() => {
    if (!campaign) return;
    const id = setInterval(() => {
      setInWindow(isWithinDailyWindow(campaign.dailyStart, campaign.dailyEnd));
    }, 60_000);
    return () => clearInterval(id);
  }, [campaign]);

  const videoUrls = (campaign?.signedUrls ?? []).filter((u) => /\.(mp4|mov|webm)/i.test(u.split("?")[0]));
  const imageUrls = (campaign?.signedUrls ?? []).filter((u) => /\.(jpg|jpeg|png|webp|gif)/i.test(u.split("?")[0]));
  const hasMedia = videoUrls.length > 0 || imageUrls.length > 0;

  const handleVideoEnded = () => {
    if (videoUrls.length > 1) {
      setMediaIndex((i) => (i + 1) % videoUrls.length);
    } else {
      videoRef.current?.play();
    }
  };

  if (phase === "verifying") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60 text-sm animate-pulse">{t("chauffeur.ecran.verifying")}</p>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-white/50 text-2xl">⛔</p>
        <p className="text-white/70 text-sm max-w-xs">{error ?? t("chauffeur.ecran.invalid_qr")}</p>
      </div>
    );
  }

  // Out of daily window
  if (campaign && !inWindow) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-white/20 text-5xl font-bold tracking-widest">
          {new Date().toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-white/40 text-xs">
          {t("chauffeur.ecran.broadcast_window", { start: campaign.dailyStart, end: campaign.dailyEnd, company: campaign.company })}
        </p>
        <p className="text-white/20 text-[10px] mt-6">{vehicle?.name}</p>
      </div>
    );
  }

  // No active campaign
  if (!campaign || !hasMedia) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white/10 text-6xl font-black tracking-widest">MOVESPOT</div>
        <p className="text-white/20 text-xs tracking-widest uppercase">{t("chauffeur.ecran.no_campaign")}</p>
        {vehicle && <p className="text-white/10 text-[10px] mt-6">{vehicle.name}</p>}
      </div>
    );
  }

  // Video player
  if (videoUrls.length > 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          key={videoUrls[mediaIndex % videoUrls.length]}
          src={videoUrls[mediaIndex % videoUrls.length]}
          autoPlay
          playsInline
          muted
          onEnded={handleVideoEnded}
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-3 right-4 text-white/20 text-[10px] select-none pointer-events-none">
          {campaign.company} · {vehicle?.name}
        </div>
      </div>
    );
  }

  // Image slideshow (fallback when only images)
  return (
    <ImageSlideshow
      urls={imageUrls}
      company={campaign.company}
      vehicleName={vehicle?.name ?? ""}
    />
  );
}

function ImageSlideshow({ urls, company, vehicleName }: { urls: string[]; company: string; vehicleName: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (urls.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % urls.length), 8000);
    return () => clearInterval(id);
  }, [urls.length]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <img
        key={urls[idx]}
        src={urls[idx]}
        alt=""
        className="w-full h-full object-contain transition-opacity duration-500"
      />
      <div className="absolute bottom-3 right-4 text-white/20 text-[10px] select-none pointer-events-none">
        {company} · {vehicleName}
      </div>
    </div>
  );
}
