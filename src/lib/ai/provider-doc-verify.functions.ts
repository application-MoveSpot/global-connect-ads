import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { captureServerException } from "@/lib/sentry.server";
import { getAiGatewayFetchConfig } from "./ai-gateway.server";

const INPUT = z.object({
  kbisPath: z.string().min(1).max(500).nullable().optional(),
  rcProPath: z.string().min(1).max(500).nullable().optional(),
  ribPath: z.string().min(1).max(500).nullable().optional(),
  idDocPath: z.string().min(1).max(500).nullable().optional(),
});

export type DocVerifyReport = {
  kbis?: { ok: boolean; reason: string };
  rc_pro?: { ok: boolean; reason: string };
  rib?: { ok: boolean; reason: string };
  id_doc?: { ok: boolean; reason: string };
};

export type DocVerifyResult = {
  status: "verified" | "rejected";
  report: DocVerifyReport;
  rejectedDocs: string[];
};

const DOC_PROMPTS: Record<string, string> = {
  kbis: `Tu es expert en documents administratifs français. Analyse cette image et vérifie si c'est un extrait Kbis ou document équivalent (extrait RCS, extrait K, etc.).
Critères : présence d'un en-tête officiel (greffe, infogreffe, etc.), numéro SIRET/SIREN visible, raison sociale, mention légale.
Réponds UNIQUEMENT en JSON : { "ok": true, "reason": "Kbis authentique, SIRET visible." }
Si invalide : { "ok": false, "reason": "Document illisible / pas un Kbis." }`,

  rc_pro: `Tu es expert en documents d'assurance français. Analyse cette image et vérifie si c'est une attestation RC Pro (responsabilité civile professionnelle).
Critères : nom de l'assureur visible, numéro de contrat ou de police, période de validité, objet "responsabilité civile professionnelle".
Réponds UNIQUEMENT en JSON : { "ok": true, "reason": "Attestation RC Pro valide, assureur et période visibles." }
Si invalide : { "ok": false, "reason": "Document illisible / pas une attestation RC Pro." }`,

  rib: `Tu es expert en documents bancaires français. Analyse cette image et vérifie si c'est un RIB (relevé d'identité bancaire).
Critères : IBAN visible (commence par FR), BIC/SWIFT, nom du titulaire, nom de la banque.
Réponds UNIQUEMENT en JSON : { "ok": true, "reason": "RIB valide, IBAN et titulaire visibles." }
Si invalide : { "ok": false, "reason": "Document illisible / pas un RIB." }`,

  id_doc: `Tu es expert en documents d'identité. Analyse cette image et vérifie si c'est une pièce d'identité officielle (CNI, passeport, titre de séjour).
Critères : photo de visage, nom et prénom, date d'expiration, élément de sécurité visible.
Réponds UNIQUEMENT en JSON : { "ok": true, "reason": "Pièce d'identité valide et lisible." }
Si invalide : { "ok": false, "reason": "Document illisible / pas une pièce d'identité reconnue." }`,
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function fetchDocAsBase64(
  signedUrl: string,
): Promise<{ base64: string; mimeType: string } | { isPdf: true; sizeBytes: number }> {
  const res = await fetch(signedUrl, { redirect: "error" });
  if (!res.ok || !res.body) throw new Error("Document inaccessible");
  const mime = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Fichier trop volumineux"); }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (mime === "application/pdf") return { isPdf: true, sizeBytes: size };
  if (!IMAGE_TYPES.has(mime)) throw new Error(`Format non pris en charge: ${mime}`);
  const { Buffer } = await import("node:buffer");
  return { base64: Buffer.concat(chunks).toString("base64"), mimeType: mime };
}

async function verifyDocViaAI(
  signedUrl: string,
  docKey: keyof typeof DOC_PROMPTS,
  apiKey: string,
): Promise<{ ok: boolean; reason: string }> {
  const downloaded = await fetchDocAsBase64(signedUrl);

  // PDF: on ne peut pas analyser visuellement — on vérifie juste la taille (> 5 KB = non vide)
  if ("isPdf" in downloaded) {
    if (downloaded.sizeBytes < 5_000) {
      return { ok: false, reason: "PDF trop petit — fichier probablement vide ou invalide." };
    }
    return { ok: true, reason: "PDF transmis et non vide (vérification visuelle non disponible)." };
  }

  const { url, headers } = getAiGatewayFetchConfig(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: DOC_PROMPTS[docKey] },
          { type: "image_url", image_url: { url: `data:${downloaded.mimeType};base64,${downloaded.base64}` } },
        ],
      }],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`AI gateway: ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { ok?: boolean; reason?: string };
  return {
    ok: parsed.ok !== false,
    reason: String(parsed.reason ?? "Vérification effectuée."),
  };
}

/**
 * Vérifie l'authenticité des documents d'un prestataire via IA (Gemini vision).
 * Appelée côté serveur pendant l'inscription en mode production.
 * Met à jour docs_ai_status et docs_ai_report sur provider_profiles.
 */
export const verifyProviderDocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof INPUT>) => INPUT.parse(d))
  .handler(async ({ data, context }): Promise<DocVerifyResult> => {
    const { userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("Clé IA manquante — vérification indisponible.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const getSignedUrl = async (path: string) => {
      const { data: s } = await supabaseAdmin.storage
        .from("provider-documents")
        .createSignedUrl(path, 120);
      if (!s?.signedUrl) throw new Error(`Impossible d'accéder au document: ${path}`);
      return s.signedUrl;
    };

    const docs: Array<{ key: keyof DocVerifyReport; path: string }> = [];
    if (data.kbisPath) docs.push({ key: "kbis", path: data.kbisPath });
    if (data.rcProPath) docs.push({ key: "rc_pro", path: data.rcProPath });
    if (data.ribPath) docs.push({ key: "rib", path: data.ribPath });
    if (data.idDocPath) docs.push({ key: "id_doc", path: data.idDocPath });

    const report: DocVerifyReport = {};

    await Promise.allSettled(
      docs.map(async ({ key, path }) => {
        try {
          const signedUrl = await getSignedUrl(path);
          report[key] = await verifyDocViaAI(signedUrl, key as keyof typeof DOC_PROMPTS, apiKey);
        } catch (err) {
          captureServerException(err, { category: "ai", userId });
          // En cas d'erreur technique on laisse passer (bénéfice du doute)
          report[key] = { ok: true, reason: "Vérification technique échouée — à revoir manuellement." };
        }
      }),
    );

    const rejectedDocs = Object.entries(report)
      .filter(([, v]) => !v.ok)
      .map(([k]) => k);

    const status: DocVerifyResult["status"] = rejectedDocs.length > 0 ? "rejected" : "verified";

    // Persiste le statut sur le profil (s'il existe déjà)
    await supabaseAdmin
      .from("provider_profiles")
      .update({ docs_ai_status: status, docs_ai_report: report })
      .eq("user_id", userId);

    return { status, report, rejectedDocs };
  });
