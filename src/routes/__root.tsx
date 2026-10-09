import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { CSP_HEADER } from "@/lib/security/csp";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import "@/lib/i18n";
import { AppUpdateGuard } from "@/components/app/AppUpdateGuard";
import { StatusBanner } from "@/components/app/StatusBanner";
import { TestEnvBanner } from "@/components/app/TestEnvBanner";
import { CookieBanner } from "@/components/app/CookieBanner";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { initSentry, Sentry } from "@/lib/sentry";
import { supabase } from "@/integrations/supabase/client";
import { captureUtm } from "@/lib/analytics/utm";
import { initPixels, firePixelEvent } from "@/lib/analytics/pixels";
import appCss from "../styles.css?url";

initSentry();

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("root.not_found_title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("root.not_found_desc")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("root.not_found_cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createRootRouteWithContext as any)()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MoveSpot" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: "https://move-spot.com/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "MoveSpot — Publicité mobile sur véhicules" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://move-spot.com/og-image.png" },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "MoveSpot" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "google-site-verification", content: "Zxfh0u093_IIhcQhtBVtR8IOteGY8APBba1oQcwcOWQ" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://move-spot.com/#organization",
              name: "MoveSpot",
              url: "https://move-spot.com",
              logo: {
                "@type": "ImageObject",
                url: "https://move-spot.com/icon-512.png",
                width: 512,
                height: 512,
              },
              description:
                "Marketplace française de publicité mobile sur véhicules : food trucks, vans, taxis, scooters de livraison.",
              areaServed: { "@type": "Country", name: "France" },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                areaServed: "FR",
                availableLanguage: ["French"],
              },
              paymentAccepted: "Carte Bancaire, Visa, Mastercard, Stripe",
              currenciesAccepted: "EUR",
              address: {
                "@type": "PostalAddress",
                addressCountry: "FR",
              },
            },
            {
              "@type": "WebSite",
              "@id": "https://move-spot.com/#website",
              url: "https://move-spot.com",
              name: "MoveSpot",
              inLanguage: "fr-FR",
              publisher: { "@id": "https://move-spot.com/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://move-spot.com/prestataires?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  // useTranslation() already re-renders on language change — no need for
  // a manual useState + i18nInstance.on() subscription (which was crashing
  // in production with "r.on is not a function").
  const lang = i18nInstance.resolvedLanguage ?? "fr";

  return (
    <html lang={lang}>
      <head>
        <HeadContent />
        <meta httpEquiv="Content-Security-Policy" content={CSP_HEADER} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          {t("root.skip_to_content")}
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    captureUtm();
    initPixels();
    firePixelEvent("PageView");

    const unsubRouter = router.subscribe("onResolved", () => {
      firePixelEvent("PageView");
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let unsubAuth: (() => void) | undefined;
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          Sentry.setUser({ id: session.user.id, email: session.user.email });
        } else {
          Sentry.setUser(null);
        }
      });
      unsubAuth = () => subscription.unsubscribe();
    } catch {
      // Supabase env vars missing (CI/dev without credentials)
    }

    return () => {
      unsubRouter();
      unsubAuth?.();
    };
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <OfflineBanner />
        <TestEnvBanner />
        <AppUpdateGuard />
        <StatusBanner />
        <Outlet />
        <CookieBanner />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Une erreur est survenue</h1>
        <p className="text-muted-foreground mb-6">
          Veuillez recharger la page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Recharger
        </button>
      </div>
    </div>
  );
}
