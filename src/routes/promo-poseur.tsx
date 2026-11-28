import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import {
  Banknote,
  CalendarClock,
  Check,
  Download,
  Landmark,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isAdmin } from "@/lib/admin/isAdmin";
import { isPreviewHostname } from "@/lib/preview-host";
import { downloadBlob, exportFilm } from "@/lib/promo/film-export";
import officialLogo from "@/assets/movespot-logo.png.asset.json";
import vanPhoto from "@/assets/promo/poseur-fourgon-atelier.jpg";
import { PROVIDER_TRIAL_DAYS } from "@/lib/providers/provider-plans";
import {
  POSEUR_DOCUMENTS,
  POSEUR_DURATION,
  POSEUR_HEIGHT,
  POSEUR_PHOTOS,
  POSEUR_SEQUENCES,
  POSEUR_WIDTH,
  poseurCaptionAt,
  poseurSequenceAt,
} from "@/lib/promo/poseur-timeline";

export const Route = createFileRoute("/promo-poseur")({
  ssr: false,
  // Film interne : visible en prévisualisation ou par un administrateur connecté, introuvable sinon.
  beforeLoad: async () => {
    if (isPreviewHostname(window.location.hostname)) return;
    const admin = await isAdmin().catch(() => false);
    if (!admin) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "MoveSpot — Film vertical Poseurs & ateliers covering" },
      {
        name: "description",
        content:
          "Film animé vertical de 35 secondes pour les poseurs et ateliers de covering en Guadeloupe.",
      },
      { property: "og:title", content: "MoveSpot — Film vertical Poseurs & ateliers covering" },
      {
        property: "og:description",
        content: "Animation 9:16 de 35 secondes avec sous-titres, à télécharger pour les réseaux sociaux.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PoseurFilm,
});

/* ── Outils d'animation ─────────────────────────────────────────────────── */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
/** Progression adoucie entre deux instants (secondes). */
const prog = (t: number, from: number, to: number) => ease((t - from) / (to - from));
const rise = (p: number, distance = 60): CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * distance}px)`,
});
const INK = (pct: number) => `color-mix(in oklab, var(--foreground) ${pct}%, transparent)`;
const ORANGE = (pct: number) => `color-mix(in oklab, var(--primary) ${pct}%, transparent)`;

const matStyle: CSSProperties = {
  backgroundImage: `linear-gradient(${INK(7)} 2px, transparent 2px), linear-gradient(90deg, ${INK(7)} 2px, transparent 2px), linear-gradient(${INK(4)} 1px, transparent 1px), linear-gradient(90deg, ${INK(4)} 1px, transparent 1px)`,
  backgroundSize: "180px 180px, 180px 180px, 36px 36px, 36px 36px",
};

function Kicker({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="font-mono uppercase text-primary"
      style={{ fontSize: 30, letterSpacing: 6, ...style }}
    >
      {children}
    </div>
  );
}

/* ── Le fourgon photographié et son covering ────────────────────────────── */
const VAN_RATIO = 800 / 1200;
/** Flanc utile du fourgon, en fraction de la photo. */
const PANEL = { left: 0.392, top: 0.258, width: 0.516, height: 0.292 };

function VanPhoto({
  width,
  cover,
  zoom = 1,
  flash = 0,
  lettering = true,
  children,
}: {
  width: number;
  /** Part d'adhésif déjà posée, de 0 à 1 (de l'avant vers l'arrière). */
  cover: number;
  zoom?: number;
  flash?: number;
  /** Affiche le texte de l'adhésif (masqué sur les vignettes, parfois inversées). */
  lettering?: boolean;
  children?: ReactNode;
}) {
  const height = width * VAN_RATIO;
  const k = width / 960;
  const panel: CSSProperties = {
    left: PANEL.left * width,
    top: PANEL.top * height,
    width: PANEL.width * width,
    height: PANEL.height * height,
    clipPath: `inset(0 ${(1 - cover) * 100}% 0 0 round ${6 * k}px)`,
  };
  return (
    <div className="relative overflow-hidden bg-muted" style={{ width, height, borderRadius: 24 * k }}>
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: "60% 45%" }}>
        <img
          src={vanPhoto}
          crossOrigin="anonymous"
          alt="Fourgon utilitaire blanc dans un atelier de covering"
          width={1200}
          height={800}
          className="absolute inset-0 size-full"
        />
        {/* L'adhésif épouse les ombres de la tôle (fusion en multiplication). */}
        <div className="absolute bg-primary" style={{ ...panel, mixBlendMode: "multiply" }} />
        <div className="absolute text-primary-foreground" style={{ ...panel, opacity: lettering ? 1 : 0 }}>
          <div
            className="absolute font-display font-bold"
            style={{ left: 30 * k, top: 34 * k, fontSize: 64 * k, lineHeight: 1 }}
          >
            VOTRE PUB ICI
          </div>
          <div
            className="absolute font-semibold"
            style={{ left: 32 * k, top: 112 * k, fontSize: 30 * k }}
          >
            Campagne locale · Guadeloupe
          </div>
        </div>
        {cover > 0 && cover < 1 && (
          <div
            className="absolute rounded-full bg-foreground"
            style={{
              left: (PANEL.left + PANEL.width * cover) * width - 7 * k,
              top: PANEL.top * height - 14 * k,
              width: 14 * k,
              height: PANEL.height * height + 28 * k,
              boxShadow: `0 0 ${24 * k}px ${ORANGE(70)}`,
            }}
          />
        )}
      </div>
      {flash > 0 && <div className="absolute inset-0 bg-background" style={{ opacity: flash }} />}
      {children}
    </div>
  );
}

/* ── Séquence 1 : inscris ton atelier ───────────────────────────────────── */
function SceneAccroche({ t }: { t: number }) {
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground">
      <div className="absolute" style={{ left: 90, top: 290, right: 90 }}>
        <Kicker style={rise(prog(t, 0.1, 0.8), 30)}>Atelier covering · Guadeloupe</Kicker>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 84, lineHeight: 1.06, marginTop: 24, ...rise(prog(t, 0.3, 1.2)) }}
        >
          Poseur vinyle ou covering en Guadeloupe&nbsp;?
        </h2>
      </div>
      <div className="absolute" style={{ left: 60, top: 640, opacity: prog(t, 0.2, 1) }}>
        <VanPhoto width={960} cover={prog(t, 1.6, 4.2)} zoom={1.1 - 0.1 * prog(t, 0, 6)} />
      </div>
      <div className="absolute" style={{ left: 60, right: 60, top: 1316 }}>
        <div className="flex items-center justify-center" style={{ gap: 16 }}>
          <span className="font-display font-bold" style={{ fontSize: 40, ...rise(prog(t, 2.5, 3.1), 30) }}>
            Inscris ton atelier
          </span>
          {POSEUR_DOCUMENTS.map((doc, i) => (
            <span
              key={doc}
              className="rounded-full border-4 border-foreground font-display font-bold"
              style={{
                fontSize: 34,
                padding: "6px 24px",
                ...rise(prog(t, 2.8 + i * 0.3, 3.3 + i * 0.3), 30),
              }}
            >
              {doc}
            </span>
          ))}
        </div>
        <p
          className="text-center font-display font-bold"
          style={{ fontSize: 46, marginTop: 22, ...rise(prog(t, 4.5, 5.2), 30) }}
        >
          <span className="bg-primary text-primary-foreground" style={{ padding: "2px 16px" }}>
            {PROVIDER_TRIAL_DAYS} jours d'essai gratuit
          </span>
        </p>
      </div>
    </div>
  );
}

/* ── Séquence 2 : la mission arrive ─────────────────────────────────────── */
const MISSION_ROWS = [
  { Icon: Banknote, label: "Honoraire affiché" },
  { Icon: MapPin, label: "Adresse du véhicule" },
  { Icon: CalendarClock, label: "Créneau de pose" },
] as const;

function SceneMissions({ t }: { t: number }) {
  const card = prog(t, 8.6, 9.6);
  const accepted = prog(t, 14.5, 15);
  const press = t > 14.2 && t < 14.6 ? 0.96 : 1;
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground" style={matStyle}>
      <div className="absolute" style={{ left: 90, right: 90, top: 290 }}>
        <Kicker style={rise(prog(t, 7.3, 8), 30)}>Mise en relation</Kicker>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 96, lineHeight: 1.04, marginTop: 24, ...rise(prog(t, 7.4, 8.3)) }}
        >
          Zéro démarchage commercial.
        </h2>
      </div>

      <div
        className="absolute rounded-[40px] border-4 border-foreground bg-background"
        style={{ left: 70, right: 70, top: 640, padding: 32, ...rise(card, 120) }}
      >
        <div className="flex items-center" style={{ gap: 28 }}>
          <VanPhoto width={300} cover={1} />
          <div className="min-w-0 flex-1">
            <div className="font-mono uppercase text-primary" style={{ fontSize: 26, letterSpacing: 4 }}>
              Dans ta zone
            </div>
            <div className="font-display font-bold" style={{ fontSize: 56, lineHeight: 1.05, marginTop: 8 }}>
              Nouvelle mission de pose
            </div>
          </div>
        </div>
        <div style={{ marginTop: 30 }}>
          {MISSION_ROWS.map(({ Icon, label }, i) => {
            const p = prog(t, 10.6 + i * 0.7, 11.3 + i * 0.7);
            return (
              <div
                key={label}
                className="flex items-center border-t-2 border-border"
                style={{ gap: 24, padding: "22px 0", ...rise(p, 30) }}
              >
                <span
                  className="grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
                  style={{ width: 72, height: 72 }}
                >
                  <Icon style={{ width: 42, height: 42 }} strokeWidth={2.5} />
                </span>
                <span className="font-display font-bold" style={{ fontSize: 48 }}>
                  {label}
                </span>
                <Check
                  className="ml-auto text-primary"
                  style={{ width: 52, height: 52, opacity: p }}
                  strokeWidth={3.5}
                />
              </div>
            );
          })}
        </div>
        <div
          className="relative grid place-items-center rounded-full border-4 border-foreground font-display font-bold"
          style={{
            height: 112,
            fontSize: 46,
            marginTop: 14,
            transform: `scale(${press})`,
            opacity: prog(t, 13.4, 14),
            background: ORANGE(accepted * 100),
          }}
        >
          <span style={{ opacity: 1 - accepted }}>Accepter la mission</span>
          <span
            className="absolute inset-0 flex items-center justify-center text-primary-foreground"
            style={{ gap: 16, opacity: accepted }}
          >
            <Check style={{ width: 52, height: 52 }} strokeWidth={3.5} /> Acceptée en 1 clic
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Séquence 3 : la pose et ses 4 photos ───────────────────────────────── */
/** Cadrage de chaque photo de validation dans le cliché du fourgon. */
const SHOTS = [
  { position: "0% 60%", mirror: false, scale: 2.1 },
  { position: "100% 60%", mirror: false, scale: 2.1 },
  { position: "50% 50%", mirror: false, scale: 1 },
  { position: "50% 50%", mirror: true, scale: 1 },
] as const;
/** Largeur intérieure d'une vignette : (960 − 3 × 16) / 4, moins sa bordure. */
const THUMB_WIDTH = 220;
const SHOT_START = 21.2;
const SHOT_GAP = 0.75;

function SceneValidation({ t }: { t: number }) {
  // Éclair d'appareil photo à chaque prise de vue.
  const flash = Math.max(
    0,
    ...SHOTS.map((_, i) => {
      const d = t - (SHOT_START + i * SHOT_GAP);
      return d >= 0 && d < 0.3 ? 0.75 * (1 - d / 0.3) : 0;
    }),
  );
  const verdict = prog(t, 24.5, 25.3);
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground">
      <div className="absolute" style={{ left: 90, right: 90, top: 290 }}>
        <Kicker style={rise(prog(t, 16.3, 17), 30)}>Check-list de pose</Kicker>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 92, lineHeight: 1.05, marginTop: 24, ...rise(prog(t, 16.4, 17.3)) }}
        >
          Pose validée par 4&nbsp;photos.
        </h2>
      </div>
      <div className="absolute" style={{ left: 60, top: 620, opacity: prog(t, 16.4, 17.2) }}>
        <VanPhoto width={960} cover={prog(t, 18, 20.6)} flash={flash}>
          <div
            className="absolute flex items-center rounded-full bg-foreground font-display font-bold text-background"
            style={{ right: 24, top: 24, gap: 14, fontSize: 36, padding: "12px 28px", ...rise(verdict, -30) }}
          >
            <Check className="text-primary" style={{ width: 44, height: 44 }} strokeWidth={3.5} />
            Validation sous 48&nbsp;h ouvrées
          </div>
        </VanPhoto>
      </div>
      <div className="absolute grid grid-cols-4" style={{ left: 60, right: 60, top: 1290, gap: 16 }}>
        {POSEUR_PHOTOS.map((label, i) => {
          const shot = SHOTS[i]!;
          const p = prog(t, SHOT_START + i * SHOT_GAP, SHOT_START + i * SHOT_GAP + 0.4);
          return (
            <div key={label} style={{ opacity: 0.35 + 0.65 * p }}>
              <div
                className="relative overflow-hidden rounded-2xl border-4"
                style={{ height: THUMB_WIDTH * VAN_RATIO + 8, borderColor: p > 0.5 ? "var(--primary)" : INK(30) }}
              >
                <div
                  style={{
                    opacity: p,
                    transformOrigin: shot.position,
                    transform: `scale(${shot.mirror ? -shot.scale : shot.scale}, ${shot.scale})`,
                  }}
                >
                  <VanPhoto width={THUMB_WIDTH} cover={1} lettering={false} />
                </div>
                <span
                  className="absolute grid place-items-center rounded-full bg-primary text-primary-foreground"
                  style={{ right: 8, bottom: 8, width: 44, height: 44, opacity: p, transform: `scale(${0.4 + 0.6 * p})` }}
                >
                  <Check style={{ width: 30, height: 30 }} strokeWidth={4} />
                </span>
                <span
                  className="absolute font-mono font-bold"
                  style={{ left: 12, top: 6, fontSize: 28, color: p > 0.5 ? "var(--primary)" : INK(45) }}
                >
                  {i + 1}/4
                </span>
              </div>
              <div className="text-center font-display font-bold" style={{ fontSize: 28, marginTop: 8 }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Séquence 4 : virement, dépose, inscription ─────────────────────────── */
const PAYOUT_ROWS = [
  { Icon: Landmark, title: "Virement automatique sur ton RIB", note: "via Stripe Connect", at: 29 },
  { Icon: RotateCcw, title: "Mission de dépose rémunérée", note: "en fin de campagne", at: 31 },
] as const;

function ScenePaiement({ t }: { t: number }) {
  return (
    <div className="absolute inset-0 bg-background text-foreground">
      <div
        className="absolute rounded-full"
        style={{
          width: 1500,
          height: 1500,
          left: -210,
          top: 1050,
          background: `radial-gradient(closest-side, ${ORANGE(45)}, transparent)`,
          opacity: prog(t, 27.2, 29),
        }}
      />
      <div
        className="light-band absolute grid place-items-center rounded-[48px] bg-background"
        style={{ left: 380, top: 200, width: 320, height: 320, ...rise(prog(t, 27.3, 28.2), 40) }}
      >
        <img src={officialLogo.url} crossOrigin="anonymous" alt="MoveSpot" style={{ height: 240, width: "auto" }} />
      </div>
      <div className="absolute" style={{ left: 80, right: 80, top: 580 }}>
        <h2
          className="text-center font-display font-bold"
          style={{ fontSize: 80, lineHeight: 1.06, ...rise(prog(t, 27.6, 28.5)) }}
        >
          Virement Stripe Connect +&nbsp;dépose.
        </h2>
        <div style={{ marginTop: 56 }}>
          {PAYOUT_ROWS.map(({ Icon, title, note, at }) => (
            <div
              key={title}
              className="flex items-center rounded-3xl border-2 border-primary"
              style={{ gap: 28, padding: "26px 30px", marginBottom: 24, ...rise(prog(t, at, at + 0.8), 40) }}
            >
              <span
                className="grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
                style={{ width: 96, height: 96 }}
              >
                <Icon style={{ width: 56, height: 56 }} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold" style={{ fontSize: 46, lineHeight: 1.1 }}>
                  {title}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: 34, marginTop: 6 }}>
                  {note}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center" style={rise(prog(t, 33.3, 34))}>
          <div className="font-display font-semibold" style={{ fontSize: 48, marginTop: 20 }}>
            Rejoins
          </div>
          <div className="font-display font-bold text-primary" style={{ fontSize: 112, lineHeight: 1.1 }}>
            move-spot.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Film ───────────────────────────────────────────────────────────────── */
function Film({ t }: { t: number }) {
  const sequence = poseurSequenceAt(t);
  // Passage de raclette orange à chaque changement de séquence.
  const boundary = POSEUR_SEQUENCES.slice(1).find((s) => Math.abs(t - s.start) < 0.4);
  const wipe = boundary ? (t - boundary.start + 0.4) / 0.8 : null;
  const caption = poseurCaptionAt(t);
  return (
    <div
      className="relative overflow-hidden bg-background font-sans"
      style={{ width: POSEUR_WIDTH, height: POSEUR_HEIGHT }}
    >
      {sequence === "accroche" && <SceneAccroche t={t} />}
      {sequence === "missions" && <SceneMissions t={t} />}
      {sequence === "validation" && <SceneValidation t={t} />}
      {sequence === "paiement" && <ScenePaiement t={t} />}

      {sequence !== "paiement" && (
        <div className="light-band absolute" style={{ left: 90, top: 120 }}>
          <img src={officialLogo.url} crossOrigin="anonymous" alt="" style={{ height: 120, width: "auto" }} />
        </div>
      )}

      <div className="absolute flex justify-center" style={{ left: 70, right: 70, top: 1500 }}>
        <p
          key={caption}
          className="rounded-3xl border-2 border-primary bg-background text-center font-semibold text-foreground"
          style={{ fontSize: 44, lineHeight: 1.25, padding: "22px 36px", maxWidth: 940 }}
        >
          {caption}
        </p>
      </div>

      {wipe !== null && (
        <div
          className="absolute inset-y-0 bg-primary"
          style={{ left: 0, width: "130%", transform: `translateX(${-115 + wipe * 230}%) skewX(-8deg)` }}
        />
      )}
    </div>
  );
}

const timecode = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

function PoseurFilm() {
  const frame = useRef<HTMLDivElement>(null);
  const clock = useRef({ playing: false, started: 0, offset: 0 });
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recordMode, setRecordMode] = useState(false);
  const [scale, setScale] = useState(0.3);
  const film = useRef<HTMLDivElement>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exported, setExported] = useState<{ blob: Blob; name: string } | null>(null);
  const exporting = exportProgress !== null;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () =>
      setScale(Math.min(el.clientWidth / POSEUR_WIDTH, el.clientHeight / POSEUR_HEIGHT));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = clock.current;
      if (c.playing) {
        const now = c.offset + (performance.now() - c.started) / 1000;
        if (now >= POSEUR_DURATION) {
          c.playing = false;
          c.offset = POSEUR_DURATION;
          setTime(POSEUR_DURATION);
          setPlaying(false);
          setRecordMode(false);
        } else setTime(now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!recordMode && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, [recordMode]);

  const play = useCallback((from?: number) => {
    const c = clock.current;
    c.offset = from ?? (c.offset >= POSEUR_DURATION ? 0 : c.offset);
    c.started = performance.now();
    c.playing = true;
    setTime(c.offset);
    setPlaying(true);
  }, []);
  const pause = useCallback(() => {
    const c = clock.current;
    if (c.playing) c.offset += (performance.now() - c.started) / 1000;
    c.playing = false;
    setPlaying(false);
  }, []);
  const startRecordMode = useCallback(() => {
    setRecordMode(true);
    void document.documentElement.requestFullscreen?.().catch(() => {});
    pause();
    clock.current.offset = 0;
    setTime(0);
    window.setTimeout(() => play(0), 1500);
  }, [pause, play]);

  const downloadVideo = useCallback(async () => {
    const element = film.current?.firstElementChild;
    if (!(element instanceof HTMLElement)) return;
    pause();
    const abort = new AbortController();
    exportAbort.current = abort;
    setExported(null);
    setExportProgress(0);
    try {
      const { blob, extension } = await exportFilm({
        element,
        width: POSEUR_WIDTH,
        height: POSEUR_HEIGHT,
        fps: 30,
        duration: POSEUR_DURATION,
        renderAt: (t) => flushSync(() => setTime(t)),
        onProgress: setExportProgress,
        assetUrls: [officialLogo.url, vanPhoto],
        fontFamilies: ["Space Grotesk", "Inter", "JetBrains Mono"],
        signal: abort.signal,
      });
      const name = `movespot-poseurs-facebook.${extension}`;
      setExported({ blob, name });
      downloadBlob(blob, name);
      toast.success("Vidéo prête : le téléchargement a démarré.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error);
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "L'export de la vidéo a échoué. Essayez avec Chrome ou Edge sur ordinateur.",
        );
      }
    } finally {
      exportAbort.current = null;
      setExportProgress(null);
      clock.current.offset = 0;
      setTime(0);
    }
  }, [pause]);

  useEffect(() => () => exportAbort.current?.abort(), []);

  return (
    <main id="main-content" className="flex h-dvh flex-col bg-background text-foreground">
      <h1 className="sr-only">Film MoveSpot pour les poseurs et ateliers de covering</h1>
      <div
        ref={frame}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={recordMode ? () => setRecordMode(false) : undefined}
      >
        <div
          ref={film}
          data-testid="poseur-film"
          className="absolute left-1/2 top-1/2"
          style={{
            width: POSEUR_WIDTH,
            height: POSEUR_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <Film t={time} />
        </div>
      </div>

      {exporting && (
        <div className="border-t border-border bg-card px-4 py-3" role="status">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-medium">
                Création de la vidéo… {Math.round(exportProgress * 100)} %
              </p>
              <Progress value={exportProgress * 100} aria-label="Progression de l'export" />
              <p className="mt-2 text-xs text-muted-foreground">
                Gardez cet onglet ouvert : le téléchargement démarre automatiquement à la fin.
              </p>
            </div>
            <Button variant="outline" onClick={() => exportAbort.current?.abort()}>
              <X className="size-4" /> Annuler
            </Button>
          </div>
        </div>
      )}

      {!recordMode && !exporting && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border bg-card px-4 py-3">
          {playing ? (
            <Button onClick={pause}>
              <Pause className="size-4" /> Pause
            </Button>
          ) : (
            <Button onClick={() => play()}>
              <Play className="size-4" /> Lecture
            </Button>
          )}
          <Button variant="outline" onClick={() => play(0)}>
            <RotateCcw className="size-4" /> Rejouer
          </Button>
          <Button variant="outline" onClick={startRecordMode}>
            <Video className="size-4" /> Mode enregistrement
          </Button>
          <Button onClick={() => void downloadVideo()}>
            <Download className="size-4" /> Télécharger la vidéo
          </Button>
          {exported && (
            <Button variant="link" onClick={() => downloadBlob(exported.blob, exported.name)}>
              Enregistrer à nouveau le fichier
            </Button>
          )}
          <span className="font-mono text-sm tabular-nums text-muted-foreground" aria-live="off">
            {timecode(time)} / {timecode(POSEUR_DURATION)}
          </span>
        </div>
      )}
    </main>
  );
}
