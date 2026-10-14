import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  /** URL de la photo/vidéo panoramique de la pose (équirectangulaire 2:1) */
  src: string;
  kind?: "image" | "video";
  className?: string;
};

/**
 * Visionneuse 360° de pose : la texture est plaquée à l'intérieur d'une sphère
 * inversée, la caméra est au centre. Drag (ou tactile) pour regarder autour,
 * molette / pinch pour zoomer.
 *
 * Fallback automatique si WebGL n'est pas disponible :
 * - image → <img> avec indication "Vue 360°"
 * - video → <video> lecture normale
 */
export function Viewer360({ src, kind = "image", className }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed || !containerRef.current) return;

        // Test WebGL availability AVANT de créer le renderer
        const testCanvas = document.createElement("canvas");
        const webgl = testCanvas.getContext("webgl") ?? testCanvas.getContext("experimental-webgl");
        if (!webgl) {
          setWebglFailed(true);
          return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / Math.max(container.clientHeight, 1),
          1,
          1100,
        );
        camera.position.set(0, 0, 0.1);

        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            failIfMajorPerformanceCaveat: false,
          });
        } catch {
          setWebglFailed(true);
          return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Sphère inversée : la texture devient visible depuis l'intérieur
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);

        let videoEl: HTMLVideoElement | null = null;
        let texture: import("three").Texture;
        if (kind === "video") {
          videoEl = document.createElement("video");
          videoEl.src = src;
          videoEl.crossOrigin = "anonymous";
          videoEl.loop = true;
          videoEl.muted = true;
          videoEl.playsInline = true;
          await videoEl.play().catch(() => undefined);
          texture = new THREE.VideoTexture(videoEl);
        } else {
          texture = new THREE.TextureLoader().load(src);
        }
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Contrôles orbitaux minimalistes
        let lon = 0;
        let lat = 0;
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLon = 0;
        let startLat = 0;

        const onDown = (e: PointerEvent) => {
          dragging = true;
          startX = e.clientX;
          startY = e.clientY;
          startLon = lon;
          startLat = lat;
        };
        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          lon = startLon - (e.clientX - startX) * 0.2;
          lat = Math.max(-85, Math.min(85, startLat + (e.clientY - startY) * 0.2));
        };
        const onUp = () => {
          dragging = false;
        };
        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          camera.fov = Math.max(30, Math.min(90, camera.fov + e.deltaY * 0.05));
          camera.updateProjectionMatrix();
        };

        const el = renderer.domElement;
        el.style.touchAction = "none";
        el.style.cursor = "grab";
        el.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        el.addEventListener("wheel", onWheel, { passive: false });

        const onResize = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = Math.max(containerRef.current.clientHeight, 1);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(container);

        let raf = 0;
        const animate = () => {
          raf = requestAnimationFrame(animate);
          if (!dragging) lon += 0.02; // légère rotation automatique
          const phi = THREE.MathUtils.degToRad(90 - lat);
          const theta = THREE.MathUtils.degToRad(lon);
          camera.lookAt(
            500 * Math.sin(phi) * Math.cos(theta),
            500 * Math.cos(phi),
            500 * Math.sin(phi) * Math.sin(theta),
          );
          renderer.render(scene, camera);
        };
        animate();

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          el.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          el.removeEventListener("wheel", onWheel);
          videoEl?.pause();
          geometry.dispose();
          material.dispose();
          texture.dispose();
          renderer.dispose();
          el.remove();
        };
      } catch {
        // Tentative fallback : peut-être que WebGL a échoué à mi-chemin
        setWebglFailed(true);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [src, kind]);

  const containerClass = className ?? "relative w-full h-72 rounded-xl overflow-hidden bg-black";

  // Fallback plat si WebGL non disponible
  if (webglFailed) {
    return (
      <div className={containerClass + " flex items-center justify-center"}>
        {kind === "video" ? (
          <video
            src={src}
            controls
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={src}
            alt={t("viewer360.alt")}
            className="w-full h-full object-contain"
            draggable={false}
          />
        )}
        <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground pointer-events-none">
          {t("viewer360.webgl_unavailable")}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div ref={containerRef} className="absolute inset-0" />
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-destructive">
          {error}
        </p>
      ) : (
        <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground pointer-events-none">
          {t("viewer360.drag_hint")}
        </span>
      )}
    </div>
  );
}
