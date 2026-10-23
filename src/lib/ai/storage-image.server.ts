import { Buffer } from "node:buffer";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Inline trusted Storage images so providers never need to crawl private URLs. */
export async function inlineStorageImage(url: string, storageOrigin: string): Promise<string> {
  const imageUrl = new URL(url);
  if (
    imageUrl.origin !== new URL(storageOrigin).origin ||
    imageUrl.protocol !== "https:" ||
    imageUrl.username ||
    imageUrl.password ||
    !/^\/storage\/v1\/object\/(sign|public)\//.test(imageUrl.pathname)
  ) {
    throw new Error("Cette photo ne provient pas du stockage MoveSpot.");
  }
  const response = await fetch(imageUrl, { redirect: "error" });
  if (!response.ok || !response.body) {
    throw new Error("Photo inaccessible — rechargez vos photos puis relancez l’analyse.");
  }
  const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!IMAGE_TYPES.has(mime)) {
    await response.body.cancel();
    throw new Error("Format de photo non pris en charge. Utilisez JPEG, PNG ou WebP.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("Photo trop volumineuse pour l’analyse (8 Mo maximum).");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new Error("La photo est vide. Rechargez-la puis relancez l’analyse.");
  return `data:${mime};base64,${Buffer.concat(chunks).toString("base64")}`;
}
