import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, CanvasTexture, Color, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import sedanAsset from "@/assets/models/promo-sedan.glb.asset.json";
import carTexture from "@/assets/models/promo-car-colormap.png.asset.json";
import { CAPTION_BASELINE, captionAt, DURATION, equationStage, euroAmount, GPS_POINTS, GPS_REFRESH_SECONDS, gpsPosition, HEIGHT, OWNER_MONTHLY_EUR, OWNER_TERMS, shotAt, spring, WIDTH } from "@/lib/promo/timeline";

export interface Playback { time: number; playing: boolean; started: number; offset: number; clock?: () => number }
export interface FilmPalette { background: string; foreground: string; primary: string; accent: string; muted: string; border: string; signal: string; destructive: string; "vehicle-idle": string }

function Vehicle({ playback, logo, palette }: { playback: React.RefObject<Playback>; logo: HTMLImageElement; palette: FilmPalette }) {
  const gltf = useGLTF(sedanAsset.url, false, false, (loader) => {
    // Embedded GLB images normally use a blob fetch, blocked by this app's CSP.
    loader.register(() => ({ name: "MOVESPOT_LOCAL_TEXTURE", loadTexture: async () => {
      const texture = await new TextureLoader().loadAsync(carTexture.url);
      texture.flipY = false; texture.colorSpace = SRGBColorSpace; return texture;
    } }));
  });
  const group = useRef<Group>(null);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const scale = 4.5 / Math.max(size.x, size.z);
    const center = box.getCenter(new Vector3());
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.scale.setScalar(scale);
    return clone;
  }, [gltf.scene]);
  const decal = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = palette.primary; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = palette.foreground; ctx.fillRect(22, 16, 166, 224);
      ctx.drawImage(logo, 35, 24, 140, 184);
      ctx.font = '800 34px "Barlow Condensed"'; ctx.fillText("VOTRE PUB", 218, 95); ctx.fillText("PREND LA ROUTE", 218, 138);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture;
  }, [logo, palette]);
  const wrap = useRef<Group>(null);
  const idleColor = useMemo(() => new Color(palette["vehicle-idle"]), [palette]);
  const activeColor = useMemo(() => new Color(palette.primary), [palette]);
  useEffect(() => () => {
    decal.dispose();
    model.traverse((o) => { if (o instanceof Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
  }, [model, decal]);
  useFrame(() => {
    const t = playback.current.time;
    if (group.current) { group.current.visible = t >= 3 && t < 18; group.current.rotation.y = -.15 + Math.sin(t * .35) * .08; }
    if (wrap.current) {
      wrap.current.visible = t >= 8;
      wrap.current.scale.z = Math.max(.001, Math.min(1, spring((t - 8) * 1.4)));
      // The sheet approaches the door before flattening onto its side.
      wrap.current.scale.x = 1 + Math.exp(-Math.max(0, t - 8) * 5) * .12;
    }
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      if (o.name.startsWith("wheel-")) o.rotation.x = t < 9 ? 0 : -(t - 9) * 7;
      if (o.name !== "body") return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m instanceof MeshStandardMaterial) m.color.copy(idleColor).lerp(activeColor, Math.min(1, Math.max(0, (t - 8) * 3))); });
    });
  });
  return <group ref={group}>
    <primitive object={model} />
    <group ref={wrap}>
      <mesh position={[1.327, .86, .05]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.7, .65]} /><meshStandardMaterial map={decal} roughness={.3} polygonOffset polygonOffsetFactor={-2} /></mesh>
      <mesh position={[-1.327, .86, .05]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.7, .65]} /><meshStandardMaterial map={decal} roughness={.3} /></mesh>
    </group>
  </group>;
}

function paintFrame(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, t: number, logo: HTMLImageElement, p: FilmPalette) {
  const shot = shotAt(t); const local = t - shot.start;
  ctx.save();
  if (t < 2) ctx.translate(Math.sin(t * 46) * Math.exp(-t * 3) * 14, Math.cos(t * 39) * Math.exp(-t * 3) * 9);
  ctx.globalAlpha = 1; ctx.fillStyle = p.background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = p.border; ctx.lineWidth = 1; ctx.globalAlpha = .3;
  for (let i = 0; i < 1080; i += 90) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke(); }
  for (let i = 0; i < HEIGHT; i += 90) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  if (t < 37) { ctx.font = '800 23px "Unbounded"'; ctx.fillStyle = p.foreground; ctx.fillText("MOVESPOT / EN MOUVEMENT", 540, 140); }
  ctx.font = '800 34px "Barlow Condensed"'; ctx.fillStyle = p.primary; ctx.fillText(shot.kicker, 540, 315);
  function text(value: string, y: number, max: number, color: string, scale = 1) {
    ctx.save(); ctx.translate(540, y); ctx.scale(scale, scale); let size = max;
    ctx.font = `800 ${size}px "Barlow Condensed"`;
    while (ctx.measureText(value).width > 930 && size > 30) { size -= 2; ctx.font = `800 ${size}px "Barlow Condensed"`; }
    ctx.fillStyle = color; ctx.fillText(value, 0, 0); ctx.restore();
  }
  const entrance = .86 + .14 * spring(local * 1.4);
  if (t >= 3 && t < 29) text(shot.title, 488, 133, p.foreground, entrance);
  // Deterministic burst: a fresh reveal on the monthly result, not throughout the equation.
  if (t < 3 || (t >= 34 && t < 37)) {
    const burst = t < 3 ? t : t - 34;
    for (let i = 0; i < 80; i++) {
      const angle = i * 2.399; const radius = (120 + (i % 9) * 36) * Math.min(2.4, burst * 1.5 + .4);
      const x = 540 + Math.cos(angle) * radius; const y = 900 + Math.sin(angle) * radius + burst * burst * 75;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + burst * 2); ctx.globalAlpha = Math.max(0, 1 - burst / 3) * (.4 + (i % 6) / 10);
      ctx.fillStyle = i % 3 ? p.foreground : p.primary; ctx.fillRect(-3, -3, 8 + i % 8, 6 + i % 4); ctx.restore();
    }
  }
  if (t >= 3 && t < 18) {
    if (t >= 9) {
      // Road strips move in the same direction as the rotating wheel axles.
      ctx.save(); ctx.beginPath(); ctx.rect(60, 1080, 960, 240); ctx.clip();
      for (let i = -3; i < 9; i++) {
        const z = ((i * 170 + (t - 9) * 380) % 1500 + 1500) % 1500 - 750;
        ctx.save(); ctx.translate(540 + z, 1210 - z * .23); ctx.rotate(-.23);
        ctx.fillStyle = p.foreground; ctx.globalAlpha = .4; ctx.fillRect(-52, -5, 104, 10); ctx.restore();
      }
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(.1, local * 2));
    if (t < 8) ctx.filter = "grayscale(1)";
    ctx.drawImage(source, 25, t >= 9 ? 550 : 580, 1030, 1030); ctx.restore();
    if (t < 8) {
      const hours = Math.min(8, Math.floor((t - 3) * 1.6));
      text(`${String(hours).padStart(2, "0")}:00`, 690, 70, p.destructive);
      text("ENTRE DEUX TRAJETS", 1340, 55, p.foreground);
    } else if (t < 18) {
      text(`${euroAmount(OWNER_TERMS.minimumDailyEur)} €/JOUR · MINIMUM GARANTI`, t >= 9 ? 1310 : 1340, 62, p.primary, entrance);
    }
  }
  if (t < 3) {
    text(`${euroAmount(OWNER_MONTHLY_EUR)} €`, 920, 320, p.primary, 1 + Math.sin(t * 21) * Math.exp(-t * 4) * .1);
    text("/MOIS", 1110, 180, p.primary, entrance);
    text("22 JOURS · MINIMUM GARANTI", 1260, 52, p.foreground);
  }
  if (t >= 18 && t < 29) {
    ctx.save(); ctx.beginPath(); ctx.rect(45, 640, 990, 675); ctx.clip();
    ctx.translate(540, 990); ctx.rotate(-.18 + Math.sin(t * .09) * .025); ctx.scale(.84 + local * .005, .84 + local * .005);
    ctx.strokeStyle = p.border; ctx.lineWidth = 14;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(-490, i * 135); ctx.lineTo(490, i * 135); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 130, -400); ctx.lineTo(i * 130, 400); ctx.stroke();
      for (let j = -3; j < 3; j++) { ctx.fillStyle = p.muted; ctx.globalAlpha = .3; ctx.fillRect(i * 130 + 22, j * 135 + 24, 82, 86); ctx.globalAlpha = 1; }
    }
    const { x, y, segment, angle } = gpsPosition(t);
    ctx.strokeStyle = p.primary; ctx.lineWidth = 14; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-380, 285);
    for (let i = 1; i <= segment; i++) { const point = GPS_POINTS[i]; if (point) ctx.lineTo(point[0], point[1]); }
    ctx.lineTo(x, y); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const pulse = ((local + i * .65) % 2) / 2; ctx.globalAlpha = (1 - pulse) * .7; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 32 + pulse * 100, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // A mini-car centred exactly on the animated route endpoint.
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = p.foreground; ctx.fillRect(-20, -25, 12, 8); ctx.fillRect(9, -25, 12, 8); ctx.fillRect(-20, 17, 12, 8); ctx.fillRect(9, 17, 12, 8);
    ctx.fillStyle = p.primary; ctx.beginPath(); ctx.roundRect(-32, -19, 64, 38, 12); ctx.fill();
    ctx.fillStyle = p.background; ctx.fillRect(1, -12, 13, 24); ctx.restore();
    ctx.restore();
    ctx.fillStyle = p.border;
    ctx.beginPath(); ctx.roundRect(282, 1320, 516, 64, 16); ctx.fill();
    text(`GPS ACTIF · ${GPS_REFRESH_SECONDS}s`, 1366, 44, p.primary);
  }
  if (t >= 29 && t < 37) {
    const stage = equationStage(t); const elapsed = Math.max(0, t - (stage === 0 ? 30 : stage === 1 ? 32 : 34));
    const size = 1 + Math.sin(elapsed * 17) * Math.exp(-elapsed * 4) * .07;
    if (stage === 0) text(`${OWNER_TERMS.daysPerMonth} JOURS`, 980, 190, p.foreground, size);
    else if (stage === 1) {
      text(`${OWNER_TERMS.daysPerMonth} JOURS`, 730, 72, p.foreground);
      text(`× ${euroAmount(OWNER_TERMS.minimumDailyEur)} €`, 1020, 190, p.primary, size);
    } else {
      text(`${OWNER_TERMS.daysPerMonth} JOURS × ${euroAmount(OWNER_TERMS.minimumDailyEur)} €`, 690, 62, p.foreground);
      text(`= ${euroAmount(OWNER_MONTHLY_EUR)} €`, 975, 245, p.primary, size);
      text("/MOIS", 1115, 126, p.primary);
      const badgeOpacity = Math.min(1, Math.max(0, (t - 35) * 3));
      ctx.save(); ctx.globalAlpha = badgeOpacity;
      ctx.fillStyle = p.border; ctx.beginPath(); ctx.roundRect(90, 1200, 900, 152, 16); ctx.fill();
      text(`${OWNER_TERMS.advertiserShare * 100} % REVERSÉ`, 1263, 50, p.foreground);
      text(`Jusqu’à ${euroAmount(OWNER_TERMS.denseZoneMonthlyEur)} €/mois en zone dense`, 1316, 42, p.foreground); ctx.restore();
    }
  }
  if (t >= 37) {
    const reveal = Math.min(1, spring(local));
    ctx.save(); ctx.translate(540, 945); ctx.scale(reveal, reveal);
    ctx.fillStyle = p.foreground; ctx.beginPath(); ctx.roundRect(-200, -260, 400, 520, 12); ctx.fill();
    ctx.drawImage(logo, -160, -235, 320, 420); ctx.restore();
    text("move-spot.com".slice(0, Math.min(13, Math.floor(local * 7))), 1290, 108, p.primary);
    text("@MoveSpot_GP", 1350, 55, p.foreground);
  }
  const c = captionAt(t);
  let fontSize = 62; ctx.font = `800 ${fontSize}px "Barlow Condensed"`;
  while (ctx.measureText(c.words.join(" ")).width > 920) { fontSize -= 2; ctx.font = `800 ${fontSize}px "Barlow Condensed"`; }
  const widths = c.words.map((w) => ctx.measureText(w).width); const space = ctx.measureText(" ").width;
  let x = (WIDTH - widths.reduce((a, b) => a + b, 0) - space * (widths.length - 1)) / 2;
  ctx.textAlign = "left";
  c.words.forEach((word, i) => { ctx.fillStyle = i === c.active ? p.primary : p.foreground; ctx.fillText(word, x, CAPTION_BASELINE); x += widths[i] + space; });
  ctx.textAlign = "center";
  // One expanding/contracting shape bridges each chapter without a hard cut.
  if (t > 2.6 && t < 43.5) {
    const distance = Math.min(Math.abs(local), Math.abs(shot.end - t));
    if (distance < .4) {
      const radius = Math.pow(1 - distance / .4, 2) * 2400;
      ctx.fillStyle = p.primary; ctx.beginPath(); ctx.ellipse(540, 960, radius, radius * .65, t * .03, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Keep the logo and destination visible through the final frame.
  ctx.restore();
}

function Stepper({ playback, output, logo, palette, onTick }: { playback: React.RefObject<Playback>; output: HTMLCanvasElement; logo: HTMLImageElement; palette: FilmPalette; onTick: (time: number) => void }) {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    const state = playback.current;
    if (state.playing) state.time = state.clock ? state.clock() : Math.min(DURATION, state.offset + (performance.now() - state.started) / 1000);
    const driving = Math.min(9, Math.max(0, state.time - 9));
    camera.position.set(7.2 + Math.sin(state.time * .3) * .25 - driving * .035, 3.3 + Math.cos(state.time * .22) * .12, 4.6 - driving * .03);
    camera.lookAt(0, .55, 0); gl.render(scene, camera);
    const ctx = output.getContext("2d");
    if (ctx) paintFrame(ctx, gl.domElement, state.time, logo, palette);
    onTick(state.time);
  }, 1);
  return null;
}

export function PromoScene({ playback, output, logo, palette, onTick, onReady }: { playback: React.RefObject<Playback>; output: HTMLCanvasElement; logo: HTMLImageElement; palette: FilmPalette; onTick: (time: number) => void; onReady: () => void }) {
  return <div className="promo-renderer" aria-hidden="true"><Canvas gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} dpr={1} camera={{ fov: 38 }}>
    <ambientLight intensity={1.1} /><directionalLight position={[4, 6, 5]} intensity={3} />
    <Environment resolution={64}><Lightformer intensity={2} position={[0, 5, -2]} scale={[10, 10, 1]} /><Lightformer intensity={2} position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[4, 8, 1]} /></Environment>
    <Suspense fallback={null}><Vehicle playback={playback} logo={logo} palette={palette} /><Ready onReady={onReady} /></Suspense>
    <Stepper playback={playback} output={output} logo={logo} palette={palette} onTick={onTick} />
  </Canvas></div>;
}

function Ready({ onReady }: { onReady: () => void }) {
  const ready = useRef(false);
  useFrame(() => { if (!ready.current) { ready.current = true; onReady(); } });
  return null;
}