import { createMiddleware, createStart } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Requests closed by the browser (navigation, reload, HMR) raise "aborted"/ECONNRESET.
// They are not app errors: answer quietly instead of surfacing an error screen.
const abortedRequestMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    const msg =
      error instanceof Error ? `${error.message} ${(error as { code?: string }).code ?? ""}` : "";
    if (/aborted|ECONNRESET/i.test(msg)) {
      return new Response(null, { status: 499 }) as never;
    }
    throw error;
  }
});

// Ordered so longer prefixes are checked first (prestataires before prestataire).
const LEGACY_REDIRECTS: [string, string][] = [
  ["/annonceur", "/advertiser"],
  ["/proprietaire", "/owner"],
  ["/chauffeur", "/driver"],
  ["/prestataires", "/providers"],
  ["/prestataire", "/provider"],
  ["/partenaire", "/partner"],
];

const legacyRouteRedirectMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (request) {
      const url = new URL(request.url);
      for (const [old, next_] of LEGACY_REDIRECTS) {
        if (url.pathname === old || url.pathname.startsWith(old + "/")) {
          const location = next_ + url.pathname.slice(old.length) + url.search + url.hash;
          return new Response(null, { status: 301, headers: { Location: location } }) as never;
        }
      }
    }
    return next();
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyRouteRedirectMiddleware, abortedRequestMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
