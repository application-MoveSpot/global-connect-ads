/**
 * Export hors temps réel d'un film DOM déterministe : chaque image est rendue à son instant exact,
 * rastérisée (SVG foreignObject) sur un canvas, puis encodée — aucun saut d'image possible,
 * contrairement à un enregistrement d'écran en direct. Navigateur uniquement.
 */
export interface FilmExportOptions {
  /** Élément racine du film, à sa taille native (sans transformation). */
  element: HTMLElement;
  width: number;
  height: number;
  fps: number;
  duration: number;
  /** Rend le film à l'instant `t` de façon synchrone (flushSync). */
  renderAt: (time: number) => void;
  onProgress: (ratio: number) => void;
  /** Images référencées par le film, à intégrer dans chaque image exportée. */
  assetUrls: readonly string[];
  /** Familles de polices à intégrer. */
  fontFamilies: readonly string[];
  signal?: AbortSignal;
}

export interface FilmExportResult {
  blob: Blob;
  extension: "mp4" | "webm";
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Lecture impossible"));
    reader.readAsDataURL(blob);
  });

const fetchDataUrl = async (url: string) => blobToDataUrl(await (await fetch(url)).blob());

const escapeXmlText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const escapeXmlAttr = (text: string) => escapeXmlText(text).replace(/"/g, "&quot;");

/** Feuilles de style de la page, avec les polices utiles intégrées (une image SVG ne charge rien d'externe). */
async function collectCss(fontFamilies: readonly string[]): Promise<string> {
  const wanted = fontFamilies.map((f) => f.toLowerCase());
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[];
    try {
      rules = Array.from(sheet.cssRules);
    } catch {
      continue; // feuille d'une autre origine
    }
    const base = sheet.href ?? document.baseURI;
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) {
        parts.push(rule.cssText);
        continue;
      }
      const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim().toLowerCase();
      const range = rule.style.getPropertyValue("unicode-range");
      const latin = range === "" || /u\+0{0,4}-0{0,2}ff/i.test(range);
      if (!wanted.includes(family) || !latin) continue;
      let text = rule.cssText;
      const urls = Array.from(text.matchAll(/url\((["']?)([^"')]+)\1\)/g));
      // Le woff2 suffit : on retire les autres sources.
      const woff2 = urls.find((m) => /\.woff2(\?|$)/.test(m[2] ?? "")) ?? urls[0];
      if (!woff2?.[2]) continue;
      const data = await fetchDataUrl(new URL(woff2[2], base).href);
      text = text.replace(/src:[^;}]+/, `src: url("${data}") format("woff2")`);
      parts.push(text);
    }
  }
  return parts.join("\n");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Rendu d'une image du film impossible"));
    img.src = src;
  });
}

export async function exportFilm(options: FilmExportOptions): Promise<FilmExportResult> {
  const { element, width, height, fps, duration, renderAt, onProgress, signal } = options;
  const {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    WebMOutputFormat,
    getFirstEncodableVideoCodec,
  } = await import("mediabunny");

  const candidates = [
    { format: new Mp4OutputFormat({ fastStart: "in-memory" }), codecs: ["avc"] as const, extension: "mp4" as const },
    { format: new WebMOutputFormat(), codecs: ["vp9", "vp8"] as const, extension: "webm" as const },
  ];
  let chosen: { format: (typeof candidates)[number]["format"]; codec: "avc" | "vp9" | "vp8"; extension: "mp4" | "webm" } | null = null;
  for (const c of candidates) {
    const codec = await getFirstEncodableVideoCodec([...c.codecs], { width, height });
    if (codec) {
      chosen = { format: c.format, codec: codec as "avc" | "vp9" | "vp8", extension: c.extension };
      break;
    }
  }
  if (!chosen) throw new Error("Ce navigateur ne sait pas encoder de vidéo. Essayez avec Chrome ou Edge.");

  const [css, assets] = await Promise.all([
    collectCss(options.fontFamilies),
    Promise.all(options.assetUrls.map(async (url) => [url, await fetchDataUrl(url)] as const)),
  ]);

  const rootClass = `${document.documentElement.className} ${document.body.className}`.trim();
  const head = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject x="0" y="0" width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" class="${escapeXmlAttr(rootClass)}" style="width:${width}px;height:${height}px">` +
      `<style>${escapeXmlText(css)}</style>`,
  );
  const tail = encodeURIComponent(`</div></foreignObject></svg>`);
  const serializer = new XMLSerializer();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  const output = new Output({ format: chosen.format, target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: chosen.codec, bitrate: 8_000_000, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const frames = Math.round(duration * fps);
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException("Export annulé", "AbortError");
      renderAt(i / fps);
      let xml = serializer.serializeToString(element);
      for (const [url, data] of assets) xml = xml.split(escapeXmlAttr(url)).join(data);
      const img = await loadImage(`data:image/svg+xml;charset=utf-8,${head}${encodeURIComponent(xml)}${tail}`);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      await source.add(i / fps, 1 / fps);
      onProgress((i + 1) / frames);
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Fichier vidéo vide");
  return { blob: new Blob([buffer], { type: `video/${chosen.extension}` }), extension: chosen.extension };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
