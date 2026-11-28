import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Check, Pause, Play, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import officialLogo from "@/assets/movespot-logo.png.asset.json";
import { PROVIDER_PLANS, PROVIDER_TRIAL_DAYS } from "@/lib/providers/provider-plans";
import {
  POSEUR_CITIES,
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
  head: () => ({
    meta: [
      { title: "MoveSpot — Film vertical Poseurs & ateliers covering" },
      {
        name: "description",
        content:
          "Film animé vertical de 35 secondes pour les poseurs et ateliers de covering, signalétique et vitres teintées en Guadeloupe.",
      },
      { property: "og:title", content: "MoveSpot — Film vertical Poseurs & ateliers covering" },
      {
        property: "og:description",
        content: "Animation 9:16 de 35 secondes avec sous-titres, à enregistrer en plein écran.",
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

/* ── Séquence 1 : table de découpe ──────────────────────────────────────── */
function SceneAccroche({ t }: { t: number }) {
  const draw = prog(t, 0.2, 2.2);
  const cut = prog(t, 2.0, 3.6);
  const fill = prog(t, 3.5, 4.4);
  // Position de la lame le long du rectangle de découpe (périmètre 1080).
  const d = cut * 1080;
  const blade =
    d <= 320
      ? { x: 480 + d, y: 95 }
      : d <= 540
        ? { x: 800, y: 95 + (d - 320) }
        : d <= 860
          ? { x: 800 - (d - 540), y: 315 }
          : { x: 480, y: 315 - (d - 860) };
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground" style={matStyle}>
      <div className="absolute" style={{ left: 90, top: 300, right: 90 }}>
        <Kicker style={rise(prog(t, 0.1, 0.8), 30)}>Plan de découpe · Guadeloupe</Kicker>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 92, lineHeight: 1.05, marginTop: 28, ...rise(prog(t, 0.3, 1.2)) }}
        >
          Poseur vinyle, covering ou vitres teintées&nbsp;?
        </h2>
      </div>
      <svg
        viewBox="0 0 900 460"
        className="absolute"
        style={{ left: 60, top: 760, width: 960 }}
        fill="none"
        aria-hidden
      >
        <g stroke="var(--foreground)" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
          <path
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            d="M40 360 L40 200 Q40 170 70 165 L250 150 L330 70 Q345 55 370 55 L800 55 Q840 55 840 95 L840 360 Z"
          />
          <path
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            d="M270 150 L335 85 L450 85 L450 150 Z"
          />
          <circle cx={220} cy={370} r={58} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} fill="var(--background)" />
          <circle cx={680} cy={370} r={58} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} fill="var(--background)" />
        </g>
        <rect x={480} y={95} width={320} height={220} fill="var(--primary)" opacity={fill} />
        <rect
          x={480}
          y={95}
          width={320}
          height={220}
          stroke="var(--primary)"
          strokeWidth={6}
          pathLength={1080}
          strokeDasharray="1080"
          strokeDashoffset={1080 - d}
        />
        {cut > 0 && cut < 1 && (
          <g transform={`translate(${blade.x} ${blade.y})`}>
            <circle r={16} fill="var(--primary)" />
            <circle r={30} stroke="var(--primary)" strokeWidth={3} opacity={0.5} />
          </g>
        )}
      </svg>
      <div className="absolute" style={{ left: 90, right: 90, top: 1290 }}>
        <p
          className="font-display font-bold"
          style={{ fontSize: 68, lineHeight: 1.1, ...rise(prog(t, 3.0, 3.8)) }}
        >
          Remplis tes créneaux libres{" "}
          <span className="bg-primary text-primary-foreground" style={{ padding: "0 14px" }}>
            sans démarcher.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ── Séquence 2 : le planning ───────────────────────────────────────────── */
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"] as const;
const BUSY = new Set(["0-0", "0-1", "1-2", "2-0", "3-1", "3-3", "4-0", "4-2"]);
const TARGET = "2-1"; // mercredi, 2e créneau

function ScenePlanning({ t }: { t: number }) {
  const card = prog(t, 9.3, 10.2);
  const drop = prog(t, 12.3, 13.3);
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground" style={matStyle}>
      <div className="absolute" style={{ left: 90, right: 90, top: 280 }}>
        <Kicker style={rise(prog(t, 6.3, 7), 30)}>Mise en relation</Kicker>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 80, lineHeight: 1.06, marginTop: 24, ...rise(prog(t, 6.4, 7.3)) }}
        >
          Une plateforme, pas un carnet d'adresses à remplir.
        </h2>
      </div>

      <div
        className="absolute rounded-3xl border-4 border-foreground bg-background"
        style={{ left: 90, right: 90, top: 640, padding: 28, ...rise(card, -80) }}
      >
        <div className="flex items-center" style={{ gap: 24 }}>
          <span
            className="grid place-items-center rounded-full bg-primary text-primary-foreground"
            style={{ width: 72, height: 72 }}
          >
            <Check style={{ width: 44, height: 44 }} strokeWidth={3} />
          </span>
          <div>
            <div className="font-display font-bold" style={{ fontSize: 46 }}>
              Campagne locale réservée
            </div>
            <div className="text-muted-foreground" style={{ fontSize: 30 }}>
              Un annonceur vient de réserver un véhicule.
            </div>
          </div>
        </div>
      </div>

      <div className="absolute" style={{ left: 90, right: 90, top: 880, ...rise(prog(t, 7.2, 8.2)) }}>
        <div className="font-mono uppercase text-muted-foreground" style={{ fontSize: 26, letterSpacing: 4 }}>
          Ton planning
        </div>
        <div className="grid grid-cols-5" style={{ gap: 14, marginTop: 18 }}>
          {DAYS.map((day, col) => (
            <div key={day}>
              <div className="font-display font-bold text-center" style={{ fontSize: 32, marginBottom: 12 }}>
                {day}
              </div>
              {[0, 1, 2, 3].map((row) => {
                const key = `${col}-${row}`;
                const appear = prog(t, 7.4 + (col + row) * 0.12, 8.2 + (col + row) * 0.12);
                const base: CSSProperties = { height: 96, marginBottom: 14, opacity: appear };
                if (key === TARGET) {
                  return (
                    <div key={key} className="relative" style={base}>
                      <div
                        className="absolute inset-0 rounded-xl border-4 border-dashed border-primary"
                        style={{ opacity: 1 - drop }}
                      />
                      <div
                        className="absolute inset-0 grid place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-center"
                        style={{
                          fontSize: 26,
                          lineHeight: 1.05,
                          opacity: drop,
                          transform: `translateY(${(1 - drop) * -220}px) scale(${1 + (1 - drop) * 0.4})`,
                        }}
                      >
                        Mission
                        <br />
                        de pose
                      </div>
                    </div>
                  );
                }
                return BUSY.has(key) ? (
                  <div
                    key={key}
                    className="rounded-xl"
                    style={{
                      ...base,
                      backgroundImage: `repeating-linear-gradient(135deg, ${INK(22)} 0 6px, ${INK(8)} 6px 16px)`,
                    }}
                  />
                ) : (
                  <div key={key} className="rounded-xl border-4 border-dashed" style={{ ...base, borderColor: INK(28) }} />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex text-muted-foreground" style={{ gap: 36, fontSize: 26, marginTop: 6 }}>
          <span>▨ Déjà pris</span>
          <span>▢ Créneau libre</span>
          <span className="text-primary font-semibold" style={{ opacity: drop }}>
            ■ Mission prête
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Séquence 3 : la check-list de pose ─────────────────────────────────── */
function CheckRow({ p, title, children }: { p: number; title: string; children?: ReactNode }) {
  const tick = clamp01(p * 1.6 - 0.6);
  return (
    <div className="flex items-start" style={{ gap: 30, marginBottom: 44, ...rise(clamp01(p * 1.8), 40) }}>
      <span
        className="grid shrink-0 place-items-center rounded-2xl border-4 border-foreground"
        style={{ width: 84, height: 84, background: ORANGE(tick * 100) }}
      >
        <Check
          className="text-primary-foreground"
          style={{ width: 56, height: 56, opacity: tick, transform: `scale(${0.4 + tick * 0.6})` }}
          strokeWidth={3.5}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display font-bold" style={{ fontSize: 54, lineHeight: 1.1 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function SceneValidation({ t }: { t: number }) {
  return (
    <div className="light-band absolute inset-0 bg-background text-foreground" style={matStyle}>
      <div className="absolute" style={{ left: 90, right: 90, top: 280 }}>
        <Kicker style={rise(prog(t, 16.3, 17), 30)}>Check-list de pose</Kicker>
        <div style={{ marginTop: 56 }}>
          <CheckRow p={prog(t, 16.4, 17.8)} title="Zéro prospection commerciale" />
          <CheckRow p={prog(t, 18.5, 19.9)} title="Tu poses l'adhésif" />
          <CheckRow p={prog(t, 20.5, 23.2)} title="Tu valides avec 4 photos">
            <div className="grid grid-cols-4" style={{ gap: 14, marginTop: 22 }}>
              {POSEUR_PHOTOS.map((label, i) => {
                const shot = prog(t, 20.9 + i * 0.55, 21.3 + i * 0.55);
                return (
                  <div key={label}>
                    <div
                      className="relative overflow-hidden rounded-xl border-4 border-foreground"
                      style={{ height: 150, background: INK(6) }}
                    >
                      <div className="absolute inset-0 bg-primary" style={{ opacity: shot }} />
                      <Check
                        className="absolute text-primary-foreground"
                        style={{ width: 60, height: 60, left: "50%", top: "50%", margin: -30, opacity: shot }}
                        strokeWidth={3.5}
                      />
                    </div>
                    <div className="text-center text-muted-foreground" style={{ fontSize: 24, marginTop: 8 }}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </CheckRow>
          <CheckRow p={prog(t, 23.5, 24.9)} title="Paiement sécurisé via Stripe Connect">
            <span
              className="inline-block rounded-full border-4 border-primary font-display font-bold text-primary"
              style={{ fontSize: 34, padding: "8px 28px", marginTop: 20, ...rise(prog(t, 24.8, 25.6), 20) }}
            >
              RC Pro vérifiée
            </span>
          </CheckRow>
        </div>
      </div>
    </div>
  );
}

/* ── Séquence 4 : inscription ───────────────────────────────────────────── */
function SceneInscription({ t }: { t: number }) {
  const prices = PROVIDER_PLANS.map((p) => `${p.amountEur} €`);
  const priceText = `${prices.slice(0, -1).join(", ")} ou ${prices[prices.length - 1]}`;
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
        style={{ left: 340, top: 250, width: 400, height: 400, ...rise(prog(t, 27.3, 28.2), 40) }}
      >
        <img src={officialLogo.url} alt="MoveSpot" style={{ height: 300, width: "auto" }} />
      </div>
      <div className="absolute text-center" style={{ left: 80, right: 80, top: 720 }}>
        <h2
          className="font-display font-bold"
          style={{ fontSize: 84, lineHeight: 1.06, ...rise(prog(t, 27.8, 28.7)) }}
        >
          Référence ton atelier gratuitement
        </h2>
        <div
          className="font-display font-bold text-primary"
          style={{ fontSize: 104, marginTop: 28, ...rise(prog(t, 28.5, 29.4)) }}
        >
          move-spot.com
        </div>
        <div className="flex flex-wrap justify-center" style={{ gap: 18, marginTop: 48 }}>
          {POSEUR_CITIES.map((city, i) => (
            <span
              key={city}
              className="rounded-full border-2 border-primary font-display font-semibold"
              style={{
                fontSize: 40,
                padding: "12px 34px",
                ...rise(prog(t, 30.5 + i * 0.45, 31.1 + i * 0.45), 30),
              }}
            >
              {city}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground" style={{ fontSize: 30, marginTop: 40, opacity: prog(t, 32.4, 33.2) }}>
          {PROVIDER_TRIAL_DAYS} jours d'essai gratuit, puis abonnement à {priceText}/mois.
        </p>
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
      {sequence === "mise-en-relation" && <ScenePlanning t={t} />}
      {sequence === "validation" && <SceneValidation t={t} />}
      {sequence === "inscription" && <SceneInscription t={t} />}

      {sequence !== "inscription" && (
        <div className="light-band absolute" style={{ left: 90, top: 120 }}>
          <img src={officialLogo.url} alt="" style={{ height: 120, width: "auto" }} />
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

  return (
    <main id="main-content" className="flex h-dvh flex-col bg-background text-foreground">
      <h1 className="sr-only">Film MoveSpot pour les poseurs et ateliers de covering</h1>
      <div
        ref={frame}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={recordMode ? () => setRecordMode(false) : undefined}
      >
        <div
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

      {!recordMode && (
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
          <span className="font-mono text-sm tabular-nums text-muted-foreground" aria-live="off">
            {timecode(time)} / {timecode(POSEUR_DURATION)}
          </span>
        </div>
      )}
    </main>
  );
}
