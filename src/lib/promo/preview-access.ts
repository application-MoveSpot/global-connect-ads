/** Preview classification is not an authorization mechanism for private data. */
export function isCardStudioPreview(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '[::1]'].includes(host)) return true;
  const suffix = '(?:lovable\\.app|gpt-eng\\.com|gptengineer\\.run)';
  if (new RegExp(`^(?:id-preview|preview)(?:-[a-z0-9]+)?--[a-z0-9-]+(?:\\.[a-z0-9-]+)?\\.${suffix}$`).test(host)) return true;
  if (new RegExp(`^project--[0-9a-f-]{36}-dev\\.${suffix}$`).test(host)) return true;
  if (new RegExp(`^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?\\.[a-z0-9-]+\\.${suffix}$`).test(host)) return true;
  return /^[a-z0-9-]+\.(?:lovableproject\.com|lovableproject-dev\.com)$/.test(host);
}