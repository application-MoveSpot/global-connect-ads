import { createFileRoute } from "@tanstack/react-router";
import { Component, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, Clapperboard, Film, Loader2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import officialLogo from "@/assets/movespot-logo.png.asset.json";
import { PromoScene } from "@/components/promo/PromoScene";
import type { FilmPalette, Playback } from "@/components/promo/PromoScene";
import { DURATION, HEIGHT, recorderFormat, SHOTS, shotAt, WIDTH } from "@/lib/promo/timeline";

export const Route = createFileRoute("/promo-short")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MoveSpot — Studio de création YouTube Short" },
      { name: "description", content: "Studio MoveSpot : animation cinématique verticale de 45 secondes avec véhicule 3D, sous-titres et export vidéo." },
      { property: "og:title", content: "MoveSpot — Studio de création YouTube Short" },
      { property: "og:description", content: "Créez un film vertical MoveSpot : animation, suivi GPS et export vidéo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ShortStudio,
});

function timecode(time: number) { return `00:${String(Math.floor(time)).padStart(2, "0")}`; }

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function ShortStudio() {
  const studio = useRef<HTMLDivElement>(null);
  const playback = useRef<Playback>({ time: 0, playing: false, started: 0, offset: 0 });
  const recorder = useRef<MediaRecorder | null>(null);
  const canceled = useRef(false);
  const tick = useRef(0);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [assets, setAssets] = useState<{ logo: HTMLImageElement; palette: FilmPalette } | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [format, setFormat] = useState<ReturnType<typeof recorderFormat>>(null);
  const [completed, setCompleted] = useState(false);
  const active = shotAt(time);
  useEffect(() => {
    let disposed = false;
    const logo = new Image(); logo.crossOrigin = "anonymous";
    logo.src = officialLogo.url;
    Promise.all([logo.decode(), document.fonts.load('800 100px "Unbounded"'), document.fonts.load('800 100px "Barlow Condensed"')]).then(() => {
      if (disposed || !studio.current) return;
      const css = getComputedStyle(studio.current);
      const palette = Object.fromEntries(["background", "foreground", "primary", "accent", "muted", "border", "signal", "destructive"].map((key) => [key, css.getPropertyValue(`--${key}`).trim()])) as unknown as FilmPalette;
      // Canvas2D accepts oklch, but Three's Color does not: resolve tokens through Canvas.
      const probe = document.createElement("canvas").getContext("2d");
      if (probe) {
        for (const key of Object.keys(palette) as (keyof FilmPalette)[]) {
          probe.fillStyle = palette[key]; probe.fillRect(0, 0, 1, 1);
          const pixel = probe.getImageData(0, 0, 1, 1).data;
          palette[key] = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        }
      }
      setAssets({ logo, palette });
    }).catch(() => { if (!disposed) setError("Le logo ou les polices n’ont pas pu être chargés. Rechargez le studio."); });
    if (typeof MediaRecorder !== "undefined") setFormat(recorderFormat((mime) => MediaRecorder.isTypeSupported(mime)));
    return () => {
      disposed = true; canceled.current = true;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setError("La scène 3D n’a pas pu être chargée. Vérifiez votre connexion et rechargez le studio."), []);
  const onTick = useCallback((t: number) => {
    if (performance.now() - tick.current > 100 || t === DURATION) { tick.current = performance.now(); setTime(t); }
    if (t >= DURATION && playback.current.playing) {
      playback.current.playing = false; setPlaying(false);
      if (recorder.current?.state === "recording") recorder.current.stop();
    }
  }, []);
  function seek(t: number) {
    if (recording) return;
    playback.current.time = t; playback.current.offset = t; playback.current.started = performance.now(); setTime(t);
  }
  function togglePlay() {
    if (playback.current.playing) { playback.current.playing = false; setPlaying(false); }
    else {
      if (playback.current.time >= DURATION) seek(0);
      playback.current.offset = playback.current.time; playback.current.started = performance.now(); playback.current.playing = true; setPlaying(true);
    }
  }
  function exportVideo() {
    if (!canvas || !format || !ready) return;
    setError(""); setCompleted(false); canceled.current = false;
    let stream: MediaStream | null = null;
    try {
      stream = canvas.captureStream(30);
      const instance = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 12_000_000 });
      const chunks: Blob[] = []; recorder.current = instance;
      instance.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      instance.onstop = () => {
        instance.stream.getTracks().forEach((track) => track.stop()); recorder.current = null; setRecording(false);
        if (canceled.current) return;
        const blob = new Blob(chunks, { type: instance.mimeType });
        if (!blob.size) { setError("L’export est vide. Essayez un autre navigateur."); return; }
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `movespot-short-1080x1920.${format.extension}`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000); setCompleted(true);
      };
      instance.onerror = () => {
        canceled.current = true; playback.current.playing = false; setPlaying(false); setRecording(false);
        instance.stream.getTracks().forEach((track) => track.stop()); setError("L’enregistrement a échoué. Réessayez avec un autre navigateur.");
      };
      playback.current = { time: 0, playing: true, started: performance.now(), offset: 0 };
      instance.start(1000); setTime(0); setRecording(true); setPlaying(true);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      setError("Ce navigateur ne permet pas l’export du canvas. Essayez Chrome ou Edge.");
    }
  }
  function cancelExport() {
    canceled.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    playback.current.playing = false; setPlaying(false); setRecording(false);
  }

  return <div ref={studio} className="promo-studio" id="main-content">
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-border px-5 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-10 items-center justify-center rounded bg-header"><img src={officialLogo.url} alt="MoveSpot" className="h-10 w-auto" /></div>
        <div><p className="text-sm font-semibold">MoveSpot <span className="text-muted-foreground">/ Studio</span></p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">MOTION DESIGN — ÉDITION 01</p></div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">YouTube Shorts</span><ArrowUpRight className="h-3 w-3" /><span className="border-l border-border pl-3">9:16</span></div>
    </header>
    <main className="promo-stage">
      <aside>
        <div className="promo-project"><div>
          <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary"><Clapperboard className="h-3 w-3" /> LE FILM</p>
          <h1 className="promo-condensed text-4xl font-extrabold leading-none">VOTRE PUB.<br /><span className="text-primary">EN MOUVEMENT.</span></h1>
        </div><p className="mt-4 text-xs text-muted-foreground">45 secondes <span className="mx-2 text-border">/</span> 6 séquences</p></div>
        <div className="promo-sequences mt-10">
          <p className="mb-5 text-[10px] uppercase tracking-widest text-muted-foreground">SÉQUENCES</p>
          {SHOTS.map((shot, i) => <Button key={shot.start} variant="ghost" disabled={recording || !ready} onClick={() => seek(shot.start)} className={`promo-sequence mb-2 flex h-14 w-full justify-start gap-3 rounded-none px-2 ${active.start === shot.start ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
            <span className={`font-mono text-xs ${active.start === shot.start ? "text-primary" : "text-muted-foreground"}`}>{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0 text-left"><span className="block text-xs">{shot.name}</span><span className="mt-1 block font-mono text-[10px] text-muted-foreground">{timecode(shot.start)} — {timecode(shot.end)}</span></span>
            {active.start === shot.start && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </Button>)}
        </div>
        <p className="mt-8 hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">SCÉNARIO / SANS PROMESSE DE REVENUS</p>
      </aside>
      <section className="min-w-0" aria-label="Aperçu du Short">
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground"><span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${recording ? "bg-destructive" : "bg-primary"}`} />{recording ? "Enregistrement" : "Aperçu"}</span><span>1080 × 1920</span></div>
        <div className="promo-film relative" data-scene-ready={ready ? "true" : undefined}>
          <canvas ref={setCanvas} width={WIDTH} height={HEIGHT} aria-label="Animation MoveSpot verticale" />
          {!ready && !error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><p className="text-xs">Préparation du film…</p></div>}
          {error && <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center text-sm text-destructive" role="alert">{error}</div>}
        </div>
        <div className="mx-auto mt-5 max-w-[405px]">
          <input type="range" aria-label="Position dans le film" min={0} max={45} step={.1} value={time} disabled={recording || !ready} onChange={(e) => seek(Number(e.target.value))} className="promo-track h-1 w-full cursor-pointer" />
          <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title={playing ? "Pause" : "Lancer l’animation"} aria-label={playing ? "Pause" : "Lancer l’animation"} disabled={!ready || recording} onClick={togglePlay}>{playing ? <Pause /> : <Play />}</Button>
            <Button variant="ghost" size="icon" title="Recommencer" aria-label="Recommencer" disabled={!ready || recording} onClick={() => seek(0)}><RotateCcw /></Button>
          </div><p className="font-mono text-xs"><span className="text-foreground">{timecode(time)}</span><span className="text-muted-foreground"> / 00:45</span></p></div>
        </div>
      </section>
      <aside className="promo-delivery">
        <div><p className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"><Film className="h-3 w-3" /> LIVRAISON</p>
          <h2 className="promo-condensed text-2xl">LE FORMAT SHORT.</h2>
          <dl className="mt-6 space-y-4 text-xs">
            {[['Définition', '1080 × 1920'], ['Durée', '45 secondes'], ['Cadence cible', '30 images/s'], ['Conteneur', format?.extension.toUpperCase() ?? 'Non disponible'], ['Audio', 'Sans audio']].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
        <div className="mt-8 min-w-0">
          <Button onClick={recording ? cancelExport : exportVideo} disabled={!ready || !format || !!error} className="h-11 w-full text-xs">{recording ? <Square /> : <ArrowDownToLine />}{recording ? "Annuler l’export" : "Télécharger la vidéo"}</Button>
          {recording && <p role="status" className="mt-3 text-xs text-primary">Enregistrement : {Math.round(time / DURATION * 100)} %</p>}
          {completed && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-signal"><Check className="h-3 w-3" /> Vidéo téléchargée</p>}
          {!format && ready && <p className="mt-3 text-xs text-destructive">Export vidéo indisponible dans ce navigateur.</p>}
        </div>
      </aside>
    </main>
    {canvas && assets && <SceneBoundary onError={onError}><PromoScene playback={playback} output={canvas} logo={assets.logo} palette={assets.palette} onTick={onTick} onReady={onReady} /></SceneBoundary>}
  </div>;
}