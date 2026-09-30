import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://move-spot.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);

        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
          { path: "/pourquoi-movespot", changefreq: "monthly", priority: "0.9", lastmod: today },
          { path: "/comment-ca-marche", changefreq: "monthly", priority: "0.9", lastmod: today },
          { path: "/tarifs", changefreq: "monthly", priority: "0.9", lastmod: today },
          { path: "/annonceurs-entreprise", changefreq: "monthly", priority: "0.8", lastmod: today },
          { path: "/commencer", changefreq: "monthly", priority: "0.8", lastmod: today },
          { path: "/devenir-partenaire", changefreq: "monthly", priority: "0.7", lastmod: today },
          { path: "/chauffeur", changefreq: "monthly", priority: "0.7", lastmod: today },
          { path: "/prestataires", changefreq: "weekly", priority: "0.7", lastmod: today },
          { path: "/contact", changefreq: "yearly", priority: "0.5", lastmod: today },
          { path: "/securite", changefreq: "yearly", priority: "0.4", lastmod: today },
          { path: "/mentions-legales", changefreq: "yearly", priority: "0.3", lastmod: today },
          { path: "/cgu", changefreq: "yearly", priority: "0.3", lastmod: today },
          { path: "/cgv", changefreq: "yearly", priority: "0.3", lastmod: today },
          { path: "/confidentialite", changefreq: "yearly", priority: "0.3", lastmod: today },
          { path: "/cookies", changefreq: "yearly", priority: "0.3", lastmod: today },
        ];

        let dynamicEntries: SitemapEntry[] = [];
        try {
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const { data } = await supabase
            .from("public_provider_profiles")
            .select("user_id, updated_at");
          if (data) {
            dynamicEntries = data.map((p) => ({
              path: `/prestataires/${p.user_id}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : today,
              changefreq: "monthly",
              priority: "0.6",
            }));
          }
        } catch {
          // fall through with static entries only
        }

        const entries = [...staticEntries, ...dynamicEntries];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
