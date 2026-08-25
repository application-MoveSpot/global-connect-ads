import { useRef, useEffect, useState, useCallback } from "react";
import type * as THREE_TYPES from "three";
import { RotateCcw, Maximize2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Prévisualisation 3D interactive du Camion Écran LED (vtype_boxled_generic).
 * Scène Three.js : châssis-cabine 3.5t avec 3 faces d'écran LED actives.
 * Rotation 360° automatique ou manuelle. Supporte vidéo MP4/WEBM et image sur les écrans.
 * Fallback CSS si WebGL indisponible.
 */

type MediaInfo = {
  type: "image" | "video";
  name: string;
  video?: HTMLVideoElement;
  textureUrl: string;
};

type Props = {
  /** URL blob ou distant d'un visuel à pré-charger sur les écrans LED */
  screenVideoUrl?: string | null;
  logoUrl?: string | null;
  className?: string;
};

// Couleurs palette camion LED
const C = {
  chassis:    0x0d0d0d,
  chassisDk:  0x060606,
  ledBezel:   0x141428,
  ledGlow:    0x1a3aff,
  cabine:     0x111118,
  glass:      0x3355aa,
  chrome:     0x444466,
  tyre:       0x1a1a2e,
  rim:        0x2d2d50,
  ground:     0x0a0b16,
  fog:        0x0c0d1a,
} as const;

export function CamionLED3DPreview({ screenVideoUrl, logoUrl, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const webglReady = useRef(false);
  const screenMeshesRef = useRef<{ mat: THREE_TYPES.MeshBasicMaterial; light: THREE_TYPES.PointLight }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const mediaRef = useRef<MediaInfo | null>(null);
  mediaRef.current = media;

  // ── Three.js init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || webglReady.current) return;

    // Vérification WebGL avant tout
    const test = document.createElement("canvas");
    const gl = test.getContext("webgl") ?? test.getContext("experimental-webgl");
    if (!gl) { setWebglFailed(true); return; }

    let disposed = false;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed || !mountRef.current) return;

      webglReady.current = true;
      const viewW = mount.clientWidth;
      const viewH = mount.clientHeight;

      // ── Scène ──
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(C.fog);
      scene.fog = new THREE.FogExp2(C.fog, 0.028);

      const camera = new THREE.PerspectiveCamera(38, viewW / viewH, 0.05, 80);
      camera.position.set(0, 2.4, 7.5);

      let renderer: THREE_TYPES.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
      } catch {
        setWebglFailed(true);
        return;
      }
      renderer.setSize(viewW, viewH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);

      // ── Contrôles ──
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 1.2, 0);
      controls.minDistance = 3;
      controls.maxDistance = 14;
      controls.minPolarAngle = Math.PI * 0.08;
      controls.maxPolarAngle = Math.PI * 0.85;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.2;
      controls.addEventListener("start", () => setShowHint(false));

      // ── Éclairage ──
      scene.add(new THREE.AmbientLight(0xffffff, 0.28));

      const sun = new THREE.DirectionalLight(0xffffff, 1.5);
      sun.position.set(6, 10, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { near: 0.5, far: 30, left: -8, right: 8, top: 8, bottom: -2 });
      sun.shadow.bias = -0.001;
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0x4466cc, 0.5);
      fill.position.set(-6, 4, -4);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xffeedd, 0.35);
      rim.position.set(0, 8, -10);
      scene.add(rim);

      // Halo LED au sol
      const ledGroundLight = new THREE.PointLight(C.ledGlow, 0, 6);
      ledGroundLight.position.set(0, 0.3, 0);
      scene.add(ledGroundLight);

      // ── Sol ──
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 24),
        new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.92, metalness: 0.04 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const grid = new THREE.GridHelper(20, 36, 0x181930, 0x181930);
      (grid.material as THREE_TYPES.Material).transparent = true;
      (grid.material as THREE_TYPES.Material).opacity = 0.5;
      grid.position.y = 0.003;
      scene.add(grid);

      // ── Helpers ──
      const box = (w: number, h: number, d: number, mat: THREE_TYPES.Material) =>
        new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

      const cyl = (rT: number, rB: number, h: number, mat: THREE_TYPES.Material, segs = 24) =>
        new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, segs), mat);

      // Matériaux
      const matChassis = new THREE.MeshStandardMaterial({ color: C.chassis, roughness: 0.82, metalness: 0.08 });
      const matBezel   = new THREE.MeshStandardMaterial({ color: C.ledBezel, roughness: 0.45, metalness: 0.5 });
      const matCab     = new THREE.MeshStandardMaterial({ color: C.cabine, roughness: 0.85, metalness: 0.06 });
      const matGlass   = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.25 });
      const matChrome  = new THREE.MeshStandardMaterial({ color: C.chrome, roughness: 0.15, metalness: 0.95 });
      const matTyre    = new THREE.MeshStandardMaterial({ color: C.tyre, roughness: 0.95, metalness: 0.0 });
      const matRim     = new THREE.MeshStandardMaterial({ color: C.rim, roughness: 0.25, metalness: 0.9 });

      // ── Groupe principal ──
      const truck = new THREE.Group();

      // — Caisse principale (boîte LED) —
      // Dimensions : L=longueur caisse, TH=hauteur, TW=largeur
      const TL = 5.2, TH = 2.8, TW = 2.1;

      const caisse = box(TL, TH, TW, matChassis);
      caisse.position.set(0.4, TH / 2 + 0.55, 0); // +0.55 = garde au sol
      caisse.castShadow = true;
      caisse.receiveShadow = true;
      truck.add(caisse);

      // Rails chrome haut / bas
      const railTop = box(TL + 0.05, 0.08, TW + 0.05, matChrome);
      railTop.position.set(0.4, TH + 0.55 + 0.04, 0);
      truck.add(railTop);

      const railBot = box(TL + 0.05, 0.1, TW + 0.05, matChrome);
      railBot.position.set(0.4, 0.6, 0);
      truck.add(railBot);

      // Seuil de caisse (marche)
      const seuil = box(TL, 0.18, TW + 0.06, new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.9 }));
      seuil.position.set(0.4, 0.64, 0);
      truck.add(seuil);

      // ── Écrans LED (3 faces : gauche, droite, arrière) ──
      const screenMats: { mat: THREE_TYPES.MeshBasicMaterial; light: THREE_TYPES.PointLight }[] = [];

      const makeLedScreen = (sw: number, sh: number, px: number, py: number, pz: number, ry: number, faceLabel: string) => {
        void faceLabel;

        // Cadre bezel
        const frame = box(sw + 0.12, sh + 0.12, 0.06, matBezel);
        frame.position.set(px, py, pz);
        frame.rotation.y = ry;
        truck.add(frame);

        // Surface LED
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x040812 });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
        screen.position.set(px + Math.sin(ry) * 0.04, py, pz + Math.cos(ry) * 0.04);
        screen.rotation.y = ry;
        screen.renderOrder = 1;
        truck.add(screen);

        // Scanlines statiques
        const slMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 });
        const sl = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), slMat);
        sl.position.copy(screen.position);
        sl.position.y += 0.001;
        sl.rotation.y = ry;
        sl.renderOrder = 2;
        truck.add(sl);

        // Halo de lueur
        const glowMat = new THREE.MeshBasicMaterial({ color: C.ledGlow, transparent: true, opacity: 0.0 });
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.6, sh + 0.4), glowMat);
        glow.position.copy(screen.position);
        glow.position.y -= 0.01;
        glow.rotation.y = ry;
        truck.add(glow);

        // PointLight LED
        const light = new THREE.PointLight(0x4466ff, 0, 4);
        light.position.set(px + Math.sin(ry) * 0.5, py, pz + Math.cos(ry) * 0.5);
        truck.add(light);

        screenMats.push({ mat: screenMat, light });
        return { screenMat, screen };
      };

      // Face gauche (ry = +π/2 → normale vers -X)
      makeLedScreen(TW - 0.2, TH - 0.35, 0.4, TH / 2 + 0.55, -TW / 2 - 0.04, Math.PI / 2, "gauche");
      // Face droite (ry = -π/2 → normale vers +X)
      makeLedScreen(TW - 0.2, TH - 0.35, 0.4, TH / 2 + 0.55, TW / 2 + 0.04, -Math.PI / 2, "droite");
      // Face arrière (ry = π → normale vers +Z)
      makeLedScreen(TL - 0.35, TH - 0.35, 0.4 - TL / 2 - 0.04, TH / 2 + 0.55, 0, Math.PI, "arrière");

      screenMeshesRef.current = screenMats;

      // — Cabine —
      const cabW = 2.1, cabH = 2.2, cabD = 2.0;
      const cabX = 0.4 + TL / 2 + cabD / 2 - 0.1;

      const cabBody = box(cabD, cabH, cabW, matCab);
      cabBody.position.set(cabX, cabH / 2 + 0.55, 0);
      cabBody.castShadow = true;
      truck.add(cabBody);

      // Toit arrondi (demi-cylindre)
      const roofGeo = new THREE.CylinderGeometry(cabW / 2, cabW / 2, cabD, 32, 1, false, 0, Math.PI);
      const roof = new THREE.Mesh(roofGeo, matCab);
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.set(cabX, cabH + 0.55 - 0.02, 0);
      roof.castShadow = true;
      truck.add(roof);

      // Pare-brise
      const windshield = box(cabD * 0.7, cabH * 0.38, 0.04, matGlass);
      windshield.position.set(cabX + 0.05, cabH * 0.72 + 0.55, 0);
      windshield.rotation.x = -0.22;
      truck.add(windshield);

      // Vitres latérales cabine
      [-cabW / 2 + 0.03, cabW / 2 - 0.03].forEach((z) => {
        const side = box(cabD * 0.5, cabH * 0.22, 0.04, matGlass);
        side.position.set(cabX - 0.1, cabH * 0.62 + 0.55, z);
        side.rotation.y = Math.PI / 2;
        truck.add(side);
      });

      // Feux avant (jaunes)
      const matFeux = new THREE.MeshStandardMaterial({ color: 0xffe050, emissive: 0xffe050, emissiveIntensity: 0.8, roughness: 0.2 });
      [-0.7, 0.7].forEach((z) => {
        const feu = box(0.08, 0.25, 0.35, matFeux);
        feu.position.set(cabX + cabD / 2, 1.15, z);
        truck.add(feu);
      });

      // Feux arrière (rouges)
      const matFeux2 = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 0.6, roughness: 0.2 });
      [-0.7, 0.7].forEach((z) => {
        const feu = box(0.08, 0.28, 0.4, matFeux2);
        feu.position.set(0.4 - TL / 2, 1.1, z);
        truck.add(feu);
      });

      // Rétroviseurs
      [-cabW / 2 - 0.18, cabW / 2 + 0.18].forEach((z) => {
        const mirror = box(0.06, 0.2, 0.12, matChrome);
        mirror.position.set(cabX + 0.15, cabH * 0.72 + 0.55, z);
        truck.add(mirror);
      });

      // ── Train roulant (roues) ──
      const makeWheel = (px: number, pz: number, twin = false) => {
        const w = 0.28, r = 0.52;
        if (twin) {
          [-0.14, 0.14].forEach((dz) => {
            const tyre = cyl(r, r, w, matTyre);
            tyre.rotation.z = Math.PI / 2;
            tyre.position.set(px, r, pz + dz);
            tyre.castShadow = true;
            truck.add(tyre);
            const rim = cyl(r * 0.55, r * 0.55, w + 0.02, matRim);
            rim.rotation.z = Math.PI / 2;
            rim.position.copy(tyre.position);
            truck.add(rim);
          });
        } else {
          const tyre = cyl(r, r, w + 0.08, matTyre);
          tyre.rotation.z = Math.PI / 2;
          tyre.position.set(px, r, pz);
          tyre.castShadow = true;
          truck.add(tyre);
          const rim = cyl(r * 0.55, r * 0.55, w + 0.1, matRim);
          rim.rotation.z = Math.PI / 2;
          rim.position.copy(tyre.position);
          truck.add(rim);
        }
      };

      // Essieux : avant (cabine) et arrière (caisse) × 2 côtés
      const axleY = 0.52;
      void axleY;
      // Avant
      makeWheel(cabX + 0.5, -cabW / 2 - 0.16);
      makeWheel(cabX + 0.5, cabW / 2 + 0.16);
      // Arrière jumelé
      makeWheel(0.4 - TL / 2 + 0.85, -TW / 2 - 0.16, true);
      makeWheel(0.4 - TL / 2 + 0.85, TW / 2 + 0.16, true);

      // Châssis (poutre centrale sous la caisse)
      const poutre = box(TL + cabD, 0.12, 0.28, new THREE.MeshStandardMaterial({ color: C.chassisDk, roughness: 0.9 }));
      poutre.position.set(0.4 + cabD / 4, 0.2, 0);
      truck.add(poutre);

      truck.position.y = 0;
      scene.add(truck);

      // ── Animate ──
      const animate = () => {
        animRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // ── Resize ──
      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      // Nettoyer
      return () => {
        disposed = true;
        ro.disconnect();
        cancelAnimationFrame(animRef.current);
        controls.dispose();
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        webglReady.current = false;
      };
    })().then((cleanup) => {
      if (cleanup && typeof cleanup === "function") {
        // Stocké pour le retour du useEffect
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { disposed = true; };
  }, []);

  // Mettre à jour la texture des écrans LED
  useEffect(() => {
    const screens = screenMeshesRef.current;
    if (!screens.length) return;

    import("three").then((THREE) => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current = null;
      }

      const activeUrl = screenVideoUrl ?? logoUrl;

      if (!activeUrl) {
        screens.forEach(({ mat, light }) => {
          mat.map = null;
          mat.color.set(0x040812);
          mat.needsUpdate = true;
          light.intensity = 0;
        });
        return;
      }

      // Vidéo
      if (screenVideoUrl) {
        const vid = document.createElement("video");
        vid.src = screenVideoUrl;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.play().catch(() => {});
        videoRef.current = vid;
        const tex = new THREE.VideoTexture(vid);
        tex.colorSpace = THREE.SRGBColorSpace;
        screens.forEach(({ mat, light }) => {
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          light.intensity = 3.5;
          light.color.set(0xffffff);
        });
      } else if (logoUrl) {
        new THREE.TextureLoader().load(logoUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          screens.forEach(({ mat, light }) => {
            mat.map = tex;
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
            light.intensity = 2.5;
            light.color.set(0xffffff);
          });
        });
      }
    });
  }, [screenVideoUrl, logoUrl]);

  // Gestion du fichier local
  const applyFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const vid = document.createElement("video");
      vid.src = url;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.play().catch(() => {});
      setMedia({ type: "video", name: file.name, video: vid, textureUrl: url });
    } else if (file.type.startsWith("image/")) {
      setMedia({ type: "image", name: file.name, textureUrl: url });
    }
  }, []);

  useEffect(() => {
    const screens = screenMeshesRef.current;
    if (!screens.length || !media) return;

    import("three").then((THREE) => {
      if (media.type === "video" && media.video) {
        const tex = new THREE.VideoTexture(media.video);
        tex.colorSpace = THREE.SRGBColorSpace;
        screens.forEach(({ mat, light }) => {
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          light.intensity = 3.5;
          light.color.set(0xffffff);
        });
      } else {
        new THREE.TextureLoader().load(media.textureUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          screens.forEach(({ mat, light }) => {
            mat.map = tex;
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
            light.intensity = 2.5;
          });
        });
      }
    });
  }, [media]);

  // Coller une image/vidéo depuis le presse-papier (Ctrl+V) sur le simulateur 3D
  const [pasteFlash, setPasteFlash] = useState(false);
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const mediaItem = items.find(
        (item) => item.type.startsWith("image/") || item.type.startsWith("video/")
      );
      if (!mediaItem) return;
      e.preventDefault();
      const file = mediaItem.getAsFile();
      if (!file) return;
      applyFile(file);
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 2000);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [applyFile]);

  // Fallback CSS si WebGL indisponible
  if (webglFailed) {
    return <CamionLEDCssFallback screenVideoUrl={screenVideoUrl} logoUrl={logoUrl} className={className} />;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-[#0c0d1a] relative select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
        className,
      )}
      style={{ height: isFullscreen ? "100dvh" : 520 }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Panneau upload */}
      <div className="absolute top-4 left-4 z-10 pointer-events-auto">
        <div className="rounded-xl bg-black/75 backdrop-blur-md border border-white/10 p-3.5 w-56">
          <div className="text-[10px] font-semibold text-white/45 uppercase tracking-widest mb-0.5">
            Camion Écran LED
          </div>
          <div className="text-sm font-bold text-white mb-3">
            📺 Prévisualisation 3D 360°
          </div>

          {/* Flash Ctrl+V */}
          {pasteFlash && (
            <div className="mb-2 rounded-lg bg-primary/20 border border-primary/40 px-2.5 py-1.5 text-xs text-primary font-semibold text-center animate-pulse">
              ✓ Visuel collé !
            </div>
          )}

          {media ? (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-semibold truncate", media.type === "video" ? "text-blue-400" : "text-green-400")}>
                  {media.type === "video" ? "🎬" : "🖼"} {media.name}
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">Appliqué sur 3 faces LED</div>
              </div>
              <button
                onClick={() => setMedia(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition shrink-0"
                title="Effacer"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition",
                isDragOver ? "border-primary bg-primary/10" : "border-white/18 hover:border-white/35 hover:bg-white/4",
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) applyFile(f);
              }}
            >
              <Upload size={18} className="text-white/45" />
              <span className="text-xs text-white/55 text-center leading-snug">
                Glisser, <span className="text-primary font-semibold">choisir</span>
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <kbd className="text-[9px] font-mono bg-white/10 text-white/50 px-1 py-0.5 rounded">Ctrl</kbd>
                <span className="text-[9px] text-white/30">+</span>
                <kbd className="text-[9px] font-mono bg-white/10 text-white/50 px-1 py-0.5 rounded">V</kbd>
                <span className="text-[9px] text-white/30 ml-0.5">coller</span>
              </div>
              <span className="text-[10px] text-white/28">MP4 · PNG · JPG · WEBM</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ""; }}
                className="hidden"
              />
            </label>
          )}

          <div className="mt-2 text-[10px] text-white/28 text-center leading-tight">
            Cliquez et faites glisser pour tourner
          </div>
        </div>
      </div>

      {/* Badge specs */}
      <div className="absolute top-4 right-14 z-10 pointer-events-none">
        <div className="rounded-lg bg-black/60 backdrop-blur border border-white/10 px-3 py-1.5 text-[10px] text-white/45 space-y-0.5">
          <div className="font-semibold text-white/65">Écran LED IP67</div>
          <div>3 faces actives</div>
          <div>3200 × 1920 px</div>
        </div>
      </div>

      {/* Fullscreen */}
      <button
        onClick={() => setIsFullscreen((v) => !v)}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white/40 hover:text-white/70 hover:bg-black/80 transition"
        title={isFullscreen ? "Réduire" : "Plein écran"}
      >
        <Maximize2 size={14} />
      </button>

      {/* Hint */}
      {showHint && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-pulse">
          <div className="rounded-full bg-black/60 backdrop-blur border border-white/10 px-3.5 py-1.5 text-xs text-white/45 flex items-center gap-2">
            <span className="text-base">🖱</span>
            Tournez à 360° — 3 faces LED actives
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="text-[10px] text-white/18 font-medium tracking-wide">
          MoveSpot · Camion LED 3D
        </div>
      </div>
    </div>
  );
}

// ── Fallback CSS (sans WebGL) ─────────────────────────────────────────────────
function CamionLEDCssFallback({ screenVideoUrl, logoUrl, className }: { screenVideoUrl?: string | null; logoUrl?: string | null; className?: string }) {
  const [rotY, setRotY] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragBaseAngle = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isAuto && !isDragging) {
      let last = 0;
      const tick = (t: number) => {
        if (last) setRotY((r) => (r + (t - last) * 0.03) % 360);
        last = t;
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isAuto, isDragging]);

  const norm = ((rotY % 360) + 360) % 360;
  const cos = Math.cos((norm * Math.PI) / 180);
  const scaleX = Math.max(0.08, Math.abs(cos));
  const isFacingBack = cos < 0;

  return (
    <div
      className={cn("rounded-2xl border border-border bg-[#0c0d1a] p-5 select-none", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Camion Écran LED — 3 faces</div>
          <div className="text-sm font-bold text-white">📺 Prévisualisation 360°</div>
        </div>
        <button
          type="button"
          onClick={() => setIsAuto((v) => !v)}
          className="rounded-full px-4 py-1.5 text-xs font-medium border border-white/15 bg-white/5 text-white/60 hover:text-white/90 transition"
        >
          {isAuto ? "⏸" : "▶ Auto"}
        </button>
      </div>

      <div
        className="flex items-center justify-center rounded-xl bg-[#070810] cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ height: 180 }}
        onMouseDown={(e) => { setIsDragging(true); setIsAuto(false); dragStartX.current = e.clientX; dragBaseAngle.current = rotY; }}
        onMouseMove={(e) => { if (!isDragging) return; setRotY((dragBaseAngle.current + (e.clientX - dragStartX.current) * 0.7) % 360); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => { setIsDragging(true); setIsAuto(false); dragStartX.current = e.touches[0].clientX; dragBaseAngle.current = rotY; }}
        onTouchMove={(e) => { if (!isDragging) return; setRotY((dragBaseAngle.current + (e.touches[0].clientX - dragStartX.current) * 0.7) % 360); }}
        onTouchEnd={() => setIsDragging(false)}
      >
        {/* Ombre sol */}
        <div style={{ position: "absolute", bottom: 16, width: 220 * scaleX, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.2)", filter: "blur(6px)", transform: "translateX(-50%)", left: "50%" }} />

        <div style={{ transform: `scaleX(${scaleX})`, transition: isDragging ? "none" : "transform 0.04s linear", filter: "drop-shadow(0 8px 18px rgba(30,100,255,0.18))" }}>
          {/* Caisse */}
          <div style={{ position: "relative", width: 240, height: 115 }}>
            {/* Corps caisse */}
            <div style={{
              position: "absolute",
              left: isFacingBack ? 0 : "32%",
              right: isFacingBack ? "32%" : 0,
              top: 0, height: 115,
              background: "linear-gradient(180deg,#111 0%,#0a0a0a 100%)",
              border: "1.5px solid #1e1e2a",
              borderRadius: isFacingBack ? "3px 2px 2px 3px" : "2px 5px 5px 2px",
            }}>
              {/* Rail chrome haut */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(180deg,#555 0%,#333 100%)", borderRadius: "inherit" }} />
              {/* Écran LED */}
              <div style={{
                position: "absolute", inset: "7px 6px 18px 6px",
                background: (screenVideoUrl || logoUrl) ? "#000" : "#03050e",
                borderRadius: 1, overflow: "hidden",
                boxShadow: "inset 0 0 0 1px rgba(40,100,255,0.4), 0 0 28px 6px rgba(20,80,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {screenVideoUrl && <video src={screenVideoUrl} loop muted playsInline autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {!screenVideoUrl && logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }} />}
                {!screenVideoUrl && !logoUrl && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(70,140,255,0.65)", letterSpacing: "0.1em" }}>ÉCRAN LED IP67</div>
                    <div style={{ fontSize: 6, color: "rgba(50,110,220,0.4)", letterSpacing: "0.08em", marginTop: 2 }}>3200 × 1920 px</div>
                  </div>
                )}
              </div>
              {/* Rail chrome bas */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 7, background: "linear-gradient(180deg,#2a2a2a 0%,#444 60%,#333 100%)" }} />
            </div>

            {/* Cabine */}
            <div style={{
              position: "absolute",
              left: isFacingBack ? "70%" : 0,
              width: "32%", top: 35, height: 80,
              background: "linear-gradient(160deg,#141414 0%,#0a0a0a 100%)",
              border: "1.5px solid #1a1a22",
              borderRadius: isFacingBack ? "2px 8px 6px 2px" : "8px 2px 2px 6px",
              zIndex: 2,
            }}>
              {/* Toit */}
              <div style={{
                position: "absolute", top: -10, height: 14,
                left: isFacingBack ? 0 : 3, right: isFacingBack ? 3 : 0,
                background: "#111", border: "1.5px solid #1a1a22", borderBottom: "none",
                borderRadius: isFacingBack ? "2px 9px 0 0" : "9px 2px 0 0",
              }} />
              {/* Pare-brise */}
              <div style={{
                position: "absolute", top: 4,
                left: isFacingBack ? 8 : 5, right: isFacingBack ? 5 : 8,
                height: 26,
                background: "linear-gradient(140deg,rgba(80,130,220,0.18) 0%,rgba(50,90,180,0.08) 100%)",
                border: "1px solid rgba(90,150,255,0.12)",
                borderRadius: isFacingBack ? "1px 6px 0 0" : "6px 1px 0 0",
              }} />
              {/* Feu */}
              <div style={{
                position: "absolute", top: 38,
                left: isFacingBack ? "auto" : 0, right: isFacingBack ? 0 : "auto",
                width: 5, height: 14,
                background: isFacingBack
                  ? "linear-gradient(180deg,rgba(255,40,40,0.9),rgba(255,70,70,0.3))"
                  : "linear-gradient(180deg,rgba(255,205,50,0.9),rgba(255,185,40,0.3))",
                borderRadius: isFacingBack ? "0 1px 1px 0" : "1px 0 0 1px",
              }} />
            </div>
          </div>

          {/* Train roulant */}
          <div style={{ position: "relative", width: 240, height: 34, marginTop: 2 }}>
            <div style={{ position: "absolute", left: isFacingBack ? 14 : 52, right: isFacingBack ? 52 : 14, top: "50%", height: 3, transform: "translateY(-50%)", background: "#1c1c26", zIndex: 0 }} />
            {/* Roue avant */}
            <div style={{ position: "absolute", left: isFacingBack ? 170 : 20, width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%,#505075 0%,#1a1a2e 100%)", border: "2.5px solid #252545", boxShadow: "inset 0 0 0 8px #22223d,inset 0 0 0 10px #3a3a58", zIndex: 1 }} />
            {/* Roues arrière jumelées */}
            {[0, 1].map((i) => (
              <div key={i} style={{ position: "absolute", left: isFacingBack ? (4 + i * 13) : (162 + i * 13), width: 30, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%,#505075 0%,#1a1a2e 100%)", border: "2.5px solid #252545", boxShadow: "inset 0 0 0 6px #22223d,inset 0 0 0 8px #3a3a58", zIndex: 1 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Angles */}
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
        {[{ l: "Écran ←", a: 0 }, { l: "3/4 Av.", a: 45 }, { l: "Cabine", a: 90 }, { l: "Écran arr.", a: 180 }, { l: "Écran →", a: 270 }].map(({ l, a }) => {
          const diff = Math.min(((norm - a + 360) % 360), ((a - norm + 360) % 360));
          const active = diff < 25;
          return (
            <button
              key={l}
              type="button"
              onClick={() => { setIsAuto(false); setRotY(a); }}
              className={cn("px-3 py-1 rounded-full text-[11px] border transition", active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40")}
            >
              {l}
            </button>
          );
        })}
      </div>

      <div className="text-center text-[10px] text-white/25 mt-2">
        WebGL non disponible — aperçu CSS (glisser pour tourner)
      </div>
    </div>
  );
}
