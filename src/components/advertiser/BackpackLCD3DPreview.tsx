import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/utils";
import { Upload, RotateCcw, Maximize2 } from "lucide-react";

type MediaInfo = {
  type: "image" | "video";
  name: string;
  video?: HTMLVideoElement;
  texture: THREE.Texture;
};

export function BackpackLCD3DPreview() {
  const mountRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<THREE.Mesh | null>(null);
  const screenLightRef = useRef<THREE.PointLight | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animIdRef = useRef<number>(0);

  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Three.js scene init ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e1a);
    scene.fog = new THREE.FogExp2(0x0c0e1a, 0.04);

    // Camera
    const W = mount.clientWidth;
    const H = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 50);
    camera.position.set(0, 1.45, 3.1);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.target.set(0, 1.1, 0);
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.minPolarAngle = Math.PI * 0.06;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.addEventListener("start", () => setShowHint(false));
    controlsRef.current = controls;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { near: 0.5, far: 22, left: -3, right: 3, top: 5, bottom: -1 });
    key.shadow.bias = -0.001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x5577cc, 0.55);
    fill.position.set(-5, 3, -2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffeedd, 0.38);
    rim.position.set(0, 7, -7);
    scene.add(rim);

    const topSpot = new THREE.SpotLight(0x3355ff, 1.2, 6, Math.PI / 7, 0.6, 1.8);
    topSpot.position.set(0, 4.5, 0.5);
    topSpot.target.position.set(0, 0, 0);
    scene.add(topSpot, topSpot.target);

    // ── Floor ──
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4, 80),
      new THREE.MeshStandardMaterial({ color: 0x10121e, roughness: 0.9, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(6, 22, 0x1c1e30, 0x1c1e30);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    grid.position.y = 0.002;
    scene.add(grid);

    // Glow ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 80),
      new THREE.MeshBasicMaterial({ color: 0x2244dd, side: THREE.DoubleSide, transparent: true, opacity: 0.22 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    scene.add(ring);

    // ── Materials ──
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1d1d2f, roughness: 0.88, metalness: 0.0 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc09070, roughness: 0.75 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0e0e14, roughness: 0.92 });
    const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0x10101e, roughness: 0.85, metalness: 0.0 });
    const bagAccMat = new THREE.MeshStandardMaterial({ color: 0x181828, roughness: 0.82 });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.95 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.25, metalness: 0.95 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x040408, roughness: 0.12, metalness: 0.98 });

    // ── Helper: add mesh ──
    const addMesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      target: THREE.Object3D,
      px: number, py: number, pz: number,
      rx = 0, ry = 0, rz = 0,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      target.add(m);
      return m;
    };

    // ── Mannequin ──
    const mannequin = new THREE.Group();

    // Head + neck
    addMesh(new THREE.SphereGeometry(0.132, 32, 32), skinMat, mannequin, 0, 1.73, 0);
    addMesh(new THREE.CylinderGeometry(0.050, 0.060, 0.11, 16), skinMat, mannequin, 0, 1.58, 0);

    // Torso
    addMesh(new THREE.CylinderGeometry(0.172, 0.142, 0.60, 28), clothMat, mannequin, 0, 1.18, 0);

    // Shoulders + arms
    ([-1, 1] as const).forEach((s) => {
      addMesh(new THREE.SphereGeometry(0.082, 16, 16), clothMat, mannequin, s * 0.232, 1.46, 0);
      addMesh(new THREE.CylinderGeometry(0.048, 0.042, 0.30, 14), clothMat, mannequin, s * 0.285, 1.29, 0.018 * s, 0, 0, s * 0.18);
      addMesh(new THREE.CylinderGeometry(0.038, 0.034, 0.27, 12), skinMat, mannequin, s * 0.328, 1.02, 0.036 * s, 0, 0, s * 0.22);
    });

    // Hips
    addMesh(new THREE.CylinderGeometry(0.152, 0.132, 0.19, 28), clothMat, mannequin, 0, 0.755, 0);

    // Legs + feet
    ([-1, 1] as const).forEach((s) => {
      addMesh(new THREE.CylinderGeometry(0.068, 0.058, 0.37, 16), clothMat, mannequin, s * 0.098, 0.46, 0);
      addMesh(new THREE.SphereGeometry(0.058, 12, 12), clothMat, mannequin, s * 0.098, 0.27, 0);
      addMesh(new THREE.CylinderGeometry(0.052, 0.044, 0.35, 16), clothMat, mannequin, s * 0.098, 0.075, 0);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.056, 0.18), shoeMat);
      foot.position.set(s * 0.098, -0.112, 0.052);
      foot.castShadow = true;
      mannequin.add(foot);
    });

    scene.add(mannequin);

    // ── Backpack ──
    const bagGroup = new THREE.Group();

    // Main body (BoxGeometry depth = 0.17 → half = 0.085)
    addMesh(new THREE.BoxGeometry(0.34, 0.50, 0.17), bagBodyMat, bagGroup, 0, 0, 0);

    // Bottom padding
    addMesh(new THREE.BoxGeometry(0.34, 0.07, 0.175), bagAccMat, bagGroup, 0, -0.215, 0.002);

    // Front pocket
    addMesh(new THREE.BoxGeometry(0.25, 0.155, 0.055), bagAccMat, bagGroup, 0, -0.142, 0.111);

    // Zipper pull
    const zipMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.82, roughness: 0.28 });
    addMesh(new THREE.BoxGeometry(0.23, 0.007, 0.009), zipMat, bagGroup, 0, -0.062, 0.119);

    // Top handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.011, 8, 18, Math.PI), metalMat);
    handle.position.set(0, 0.265, -0.003);
    handle.rotation.z = Math.PI;
    bagGroup.add(handle);

    // Shoulder straps (back face = −Z local)
    ([-1, 1] as const).forEach((s) => {
      addMesh(new THREE.BoxGeometry(0.048, 0.42, 0.024), strapMat, bagGroup, s * 0.093, 0.022, -0.095);
    });

    // Waist buckles
    ([-1, 1] as const).forEach((s) => {
      addMesh(new THREE.BoxGeometry(0.038, 0.023, 0.022), metalMat, bagGroup, s * 0.172, -0.182, -0.062);
    });

    // ── LCD screen ──
    // Screen frame
    addMesh(new THREE.BoxGeometry(0.280, 0.398, 0.011), frameMat, bagGroup, 0, 0.053, 0.087);

    // Screen surface (PlaneGeometry, faces +Z = toward camera)
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x040410 });
    const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.252, 0.368), screenMat);
    screenPlane.position.set(0, 0.053, 0.094);
    bagGroup.add(screenPlane);
    screenRef.current = screenPlane;

    // Screen glow (emissive halo, visible only when media active)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x1133ff, transparent: true, opacity: 0.0 });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.44), glowMat);
    glowPlane.position.set(0, 0.053, 0.086);
    bagGroup.add(glowPlane);

    // Screen point light
    const sLight = new THREE.PointLight(0x4466ff, 0, 2.2);
    sLight.position.set(0, 0.053, 0.22);
    bagGroup.add(sLight);
    screenLightRef.current = sLight;

    // Position on mannequin's back (+Z side)
    // Torso radius ≈ 0.172 → back surface at z ≈ 0.172
    // Bag half-depth = 0.085 → bag center at z = 0.172 + 0.085 = 0.257
    bagGroup.position.set(0, 1.13, 0.257);
    scene.add(bagGroup);

    // ── Animate ──
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Apply texture when media changes ────────────────────────────────────
  useEffect(() => {
    const screen = screenRef.current;
    const light = screenLightRef.current;
    if (!screen || !light) return;

    const mat = screen.material as THREE.MeshBasicMaterial;

    if (!media) {
      mat.map = null;
      mat.color.set(0x040410);
      mat.needsUpdate = true;
      light.intensity = 0;
      return;
    }

    mat.map = media.texture;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
    light.intensity = 3.2;
    light.color.set(0xffffff);
  }, [media]);

  // ── File handler ─────────────────────────────────────────────────────────
  const applyFile = useCallback(
    (file: File) => {
      if (!file) return;

      if (media?.video) {
        media.video.pause();
        media.video.src = "";
        media.texture.dispose();
      }

      const url = URL.createObjectURL(file);

      if (file.type.startsWith("video/")) {
        const vid = document.createElement("video");
        vid.src = url;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.play().catch(() => {});
        const tex = new THREE.VideoTexture(vid);
        tex.colorSpace = THREE.SRGBColorSpace;
        setMedia({ type: "video", name: file.name, video: vid, texture: tex });
      } else if (file.type.startsWith("image/")) {
        new THREE.TextureLoader().load(url, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          setMedia({ type: "image", name: file.name, texture: tex });
        });
      }
    },
    [media],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith("image/") || f.type.startsWith("video/"))) applyFile(f);
  };

  const resetMedia = () => {
    if (media?.video) { media.video.pause(); media.video.src = ""; }
    if (media?.texture) media.texture.dispose();
    setMedia(null);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-[#0c0e1a] relative select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
      )}
      style={{ height: isFullscreen ? "100dvh" : 540 }}
    >
      {/* Three.js canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Upload panel — top left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="rounded-xl bg-black/75 backdrop-blur-md border border-white/10 p-3.5 w-56">
          <div className="text-[10px] font-semibold text-white/45 uppercase tracking-widest mb-0.5">
            Espace Annonceur
          </div>
          <div className="text-sm font-bold text-white mb-3">
            Prévisualisation 3D 360°
          </div>

          {media ? (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-xs font-semibold truncate",
                    media.type === "video" ? "text-blue-400" : "text-green-400",
                  )}
                >
                  {media.type === "video" ? "🎬" : "🖼"} {media.name}
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">
                  Appliqué sur l'écran LCD
                </div>
              </div>
              <button
                onClick={resetMedia}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition shrink-0"
                title="Effacer le média"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition",
                isDragOver
                  ? "border-primary bg-primary/10"
                  : "border-white/18 hover:border-white/35 hover:bg-white/4",
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload size={18} className="text-white/45" />
              <span className="text-xs text-white/55 text-center leading-snug">
                Glisser-déposer ou{" "}
                <span className="text-primary font-semibold">choisir</span>
              </span>
              <span className="text-[10px] text-white/28">MP4 · PNG · JPG · WEBM</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
          )}

          {/* Tip */}
          <div className="mt-2.5 text-[10px] text-white/28 text-center leading-tight">
            Cliquez et faites glisser pour tourner
          </div>
        </div>
      </div>

      {/* Fullscreen toggle */}
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
            Tournez à 360° pour voir l'écran sous tous les angles
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="text-[10px] text-white/18 font-medium tracking-wide">
          MoveSpot · Sac LCD 3D
        </div>
      </div>
    </div>
  );
}
