/**
 * Client-side image resize before Supabase Storage upload.
 *
 * Uses Canvas API — only runs in browser contexts (all callers are React
 * event handlers). SVG and GIF files are passed through unchanged because
 * SVG is lossless vector and GIF may be animated.
 *
 * Returns the original File if:
 *  - it is not a raster image
 *  - it is already below the size threshold
 *  - createImageBitmap fails (corrupt file / unsupported codec)
 */

const SKIP_THRESHOLD_BYTES = 300_000; // never re-encode files already < 300 KB
const SKIP_TYPES = new Set(["image/svg+xml", "image/gif"]);

export async function resizeImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (SKIP_TYPES.has(file.type)) return file;
  if (file.size < SKIP_THRESHOLD_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // PNG preserves transparency; everything else becomes JPEG.
  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const outQuality = outType === "image/png" ? undefined : quality;

  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size >= file.size) {
          resolve(file); // re-encoding made it larger — keep original
          return;
        }
        resolve(new File([blob], file.name, { type: outType, lastModified: file.lastModified }));
      },
      outType,
      outQuality,
    );
  });
}

/** Resize a batch of files; non-images pass through unchanged. */
export async function resizeImageFiles(
  files: File[],
  maxDimension = 1920,
  quality = 0.85,
): Promise<File[]> {
  return Promise.all(files.map((f) => resizeImageFile(f, maxDimension, quality)));
}
