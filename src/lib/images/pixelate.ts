/** Pixelate (blur) a rectangular region of an image File. bbox values are percentages 0–100. */
export async function pixelateFileRegion(
  file: File,
  bbox: { x: number; y: number; width: number; height: number },
): Promise<File> {
  const url = URL.createObjectURL(file);
  return new Promise<File>((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const rx = Math.round((bbox.x / 100) * img.naturalWidth);
      const ry = Math.round((bbox.y / 100) * img.naturalHeight);
      const rw = Math.round((bbox.width / 100) * img.naturalWidth);
      const rh = Math.round((bbox.height / 100) * img.naturalHeight);
      const PIXEL = Math.max(8, Math.min(rw, rh) / 6);

      for (let px = rx; px < rx + rw; px += PIXEL) {
        for (let py = ry; py < ry + rh; py += PIXEL) {
          const d = ctx.getImageData(px, py, 1, 1).data;
          ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
          ctx.fillRect(px, py, Math.min(PIXEL, rx + rw - px), Math.min(PIXEL, ry + rh - py));
        }
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: blob.type }));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/** Convert a File to a base64 data URL (for sending to a server function). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
