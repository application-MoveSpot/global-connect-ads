import { useEffect, useRef, useState } from "react";

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
 */
export function Viewer360({ src, kind = "image", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed || !containerRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / Math.max(container.clientHeight, 1),
          1,
          1100,
        );
        camera.position.set(0, 0, 0.1);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Sphère inversée : la texture devient visible depuis l'intérieur
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);

        let videoEl: HTMLVideoElement | null = null;
        let texture: THREE.Texture;
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
        const onUp = () => { dragging = false; };
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
        setError("Impossible de charger la vue 360°.");
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [src, kind]);

  return (
    <div className={className ?? "relative w-full h-72 rounded-xl overflow-hidden bg-black"}>
      <div ref={containerRef} className="absolute inset-0" />
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-destructive">{error}</p>
      ) : (
        <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground pointer-events-none">
          360° · glisser pour explorer
        </span>
      )}
    </div>
  );
}
