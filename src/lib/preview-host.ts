/**
 * Reconnaît un hôte de prévisualisation Lovable (ou le serveur de développement local).
 * Sert uniquement à choisir un comportement : ce n'est jamais une autorisation utilisateur.
 */
const PREVIEW_SUFFIXES = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"] as const;
const LIVE_PREVIEW_SUFFIXES = [".lovableproject.com", ".lovableproject-dev.com"] as const;
const STATIC_PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const DEV_PROJECT_LABEL = /^project--[0-9a-f-]{36}-dev$/;
const BRANDED_LIVE_LABEL = /^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isPreviewHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (LOCAL_HOSTS.has(host)) return true;
  if (LIVE_PREVIEW_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const suffix = PREVIEW_SUFFIXES.find((s) => host.endsWith(s));
  if (!suffix) return false;
  const labels = host.slice(0, -suffix.length).split(".");
  const first = labels[0] ?? "";
  if (BRANDED_LIVE_LABEL.test(first)) return labels.length === 2;
  if (labels.length > 2) return false;
  return STATIC_PREVIEW_LABEL.test(first) || DEV_PROJECT_LABEL.test(first);
}
