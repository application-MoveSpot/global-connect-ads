const BASE = "https://move-spot.com";

type LinkTag = { rel: string; hrefLang?: string; href: string };

export function hreflangLinks(path: string): LinkTag[] {
  const url = `${BASE}${path}`;
  return [
    { rel: "alternate", hrefLang: "fr", href: url },
    { rel: "alternate", hrefLang: "en", href: url },
    { rel: "alternate", hrefLang: "ar", href: url },
    { rel: "alternate", hrefLang: "x-default", href: url },
  ];
}
