import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, CanvasTexture, Color, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import sedanAsset from "@/assets/models/promo-sedan.glb.asset.json";
import carTexture from "@/assets/models/promo-car-colormap.png.asset.json";
import { captionAt, DURATION, euroAmount, HEIGHT, OWNER_TERMS, shotAt, spring, WIDTH } from "@/lib/promo/timeline";

export interface Playback { time: number; playing: boolean; started: number; offset: number }
export interface FilmPalette { background: string; foreground: string; primary: string; accent: string; muted: string; border: string; signal: string; destructive: string }

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
  useEffect(() => () => {
    decal.dispose();
    model.traverse((o) => { if (o instanceof Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
  }, [model, decal]);
  useFrame(() => {
    const t = playback.current.time;
    if (group.current) { group.current.visible = (t >= 3 && t < 18) || (t >= 29 && t < 37); group.current.rotation.y = -.15 + Math.sin(t * .15) * .1; }
    if (wrap.current) { wrap.current.visible = t >= 8; wrap.current.scale.z = Math.max(.001, Math.min(1, spring((t - 8) * .7))); }
    model.traverse((o) => {
      if (!(o instanceof Mesh) || o.name !== "body") return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m instanceof MeshStandardMaterial) m.color.copy(new Color(palette.foreground)).lerp(new Color(palette.primary), Math.min(.6, Math.max(0, (t - 8) / 2))); });
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
  ctx.globalAlpha = 1; ctx.fillStyle = p.background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = p.border; ctx.lineWidth = 1; ctx.globalAlpha = .3;
  for (let i = 0; i < 1080; i += 90) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke(); }
  for (let i = 0; i < HEIGHT; i += 90) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.font = '800 23px "Unbounded"'; ctx.fillStyle = p.foreground; ctx.fillText("MOVESPOT / EN MOUVEMENT", 540, 140);
  ctx.font = '800 34px "Barlow Condensed"'; ctx.fillStyle = p.primary; ctx.fillText(shot.kicker, 540, 315);
  function text(value: string, y: number, max: number, color: string, scale = 1) {
    ctx.save(); ctx.translate(540, y); ctx.scale(scale, scale); let size = max;
    ctx.font = `800 ${size}px "Barlow Condensed"`;
    while (ctx.measureText(value).width > 930 && size > 30) { size -= 2; ctx.font = `800 ${size}px "Barlow Condensed"`; }
    ctx.fillStyle = color; ctx.fillText(value, 0, 0); ctx.restore();
  }
  const entrance = .86 + .14 * spring(local * 1.4);
  text(shot.title, 488, 133, t < 3 ? p.primary : p.foreground, entrance);
  // Deterministic gold burst, confetti and continuous parallax.
  if (t < 3 || (t >= 29 && t < 37)) {
    for (let i = 0; i < 80; i++) {
      const angle = i * 2.399; const radius = (50 + (i % 9) * 36) * Math.min(2.4, local + .4);
      const x = 540 + Math.cos(angle) * radius; const y = 1030 + Math.sin(angle) * radius * 1.35;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + t * .6); ctx.globalAlpha = .3 + (i % 6) / 10;
      ctx.fillStyle = i % 3 ? p.accent : p.primary; ctx.fillRect(-3, -3, 6 + i % 8, 6 + i % 4); ctx.restore();
    }
  }
  if ((t >= 3 && t < 18) || (t >= 29 && t < 37)) {
    ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(.1, local * 2));
    ctx.drawImage(source, 25, 580, 1030, 1030); ctx.restore();
    if (t < 8) {
      const hours = Math.min(8, Math.floor((t - 3) * 1.6));
      text(`${String(hours).padStart(2, "0")}:00`, 690, 70, p.destructive);
      text("ENTRE DEUX TRAJETS", 1350, 55, p.muted);
      for (let i = 0; i < 3; i++) {
        const x = 280 + i * 260; const y = 780 + ((local * 95 + i * 110) % 270);
        ctx.beginPath(); ctx.ellipse(x, y, 40, 45, t * .7, 0, Math.PI * 2); ctx.fillStyle = p.accent; ctx.fill();
        ctx.fillStyle = p.background; ctx.font = '800 42px "Barlow Condensed"'; ctx.fillText("€", x, y + 14);
      }
    } else if (t < 18) {
      text(`${euroAmount(OWNER_TERMS.minimumDailyEur)} €/JOUR · MINIMUM GARANTI`, 1370, 62, p.accent, entrance);
    } else {
      text(`${OWNER_TERMS.daysPerMonth} JOURS × ${euroAmount(OWNER_TERMS.minimumDailyEur)} €`, 660, 64, p.primary);
      text(`${OWNER_TERMS.advertiserShare * 100} % DU TARIF ANNONCEUR`, 1360, 53, p.accent);
      text(`JUSQU’À ${euroAmount(OWNER_TERMS.denseZoneMonthlyEur)} €/MOIS EN ZONE DENSE`, 1440, 48, p.foreground);
    }
  }
  if (t < 3) {
    ctx.save(); ctx.translate(540 + Math.sin(t * 25) * Math.exp(-t * 3) * 9, 970); ctx.rotate(-.09 + Math.sin(t * .2) * .03);
    ctx.font = '800 250px "Barlow Condensed"'; ctx.fillStyle = p.border;
    for (let i = 15; i > 0; i--) ctx.fillText("VOTRE", i, -40 + i);
    ctx.fillStyle = p.foreground; ctx.fillText("VOTRE", 0, -40);
    ctx.fillStyle = p.primary; ctx.fillText("VOITURE", 0, 205); ctx.restore();
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
    const points = [[-380, 285], [-120, 285], [-120, 15], [140, 15], [140, -255], [380, -255]];
    const progress = Math.min(4.99, local / 9 * 5); ctx.strokeStyle = p.primary; ctx.lineWidth = 14; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i <= Math.floor(progress); i++) ctx.lineTo(points[i][0], points[i][1]);
    const a = points[Math.floor(progress)]; const b = points[Math.floor(progress) + 1]; const f = progress % 1;
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
    ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = p.primary; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    const pulse = (local % 2) / 2; ctx.globalAlpha = 1 - pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 28 + pulse * 100, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore(); text("SUIVI GPS", 1370, 64, p.primary);
  }
  if (t >= 37) {
    const reveal = Math.min(1, spring(local));
    ctx.save(); ctx.translate(540, 945); ctx.scale(reveal, reveal);
    ctx.fillStyle = p.foreground; ctx.beginPath(); ctx.roundRect(-200, -260, 400, 520, 12); ctx.fill();
    ctx.drawImage(logo, -160, -235, 320, 420); ctx.restore();
    text("move-spot.com".slice(0, Math.min(13, Math.floor(local * 4))), 1360, 92, p.primary);
    text(`VALIDATION SOUS ${OWNER_TERMS.validationHours} H`, 1440, 52, p.accent);
  }
  const c = captionAt(t);
  let fontSize = 62; ctx.font = `800 ${fontSize}px "Barlow Condensed"`;
  while (ctx.measureText(c.words.join(" ")).width > 920) { fontSize -= 2; ctx.font = `800 ${fontSize}px "Barlow Condensed"`; }
  const widths = c.words.map((w) => ctx.measureText(w).width); const space = ctx.measureText(" ").width;
  let x = (WIDTH - widths.reduce((a, b) => a + b, 0) - space * (widths.length - 1)) / 2;
  ctx.textAlign = "left";
  c.words.forEach((word, i) => { ctx.fillStyle = i === c.active ? p.primary : p.foreground; ctx.fillText(word, x, 1545); x += widths[i] + space; });
  ctx.textAlign = "center"; ctx.fillStyle = p.muted; ctx.font = '800 24px "Unbounded"'; ctx.fillText("move-spot.com", 540, 1750);
  // One expanding/contracting shape bridges each chapter without a hard cut.
  if (t > 2.6 && t < 43.5) {
    const distance = Math.min(Math.abs(local), Math.abs(shot.end - t));
    if (distance < .4) {
      const radius = Math.pow(1 - distance / .4, 2) * 2400;
      ctx.fillStyle = p.primary; ctx.beginPath(); ctx.ellipse(540, 960, radius, radius * .65, t * .03, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t > 43.5) { ctx.globalAlpha = Math.min(1, (t - 43.5) / 1.5); ctx.fillStyle = p.background; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.globalAlpha = 1; }
}

function Stepper({ playback, output, logo, palette, onTick }: { playback: React.RefObject<Playback>; output: HTMLCanvasElement; logo: HTMLImageElement; palette: FilmPalette; onTick: (time: number) => void }) {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    const state = playback.current;
    if (state.playing) state.time = Math.min(DURATION, state.offset + (performance.now() - state.started) / 1000);
    camera.position.set(7.2 + Math.sin(state.time * .13) * .4, 3.3 + Math.cos(state.time * .1) * .25, 4.6 - state.time * .012);
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