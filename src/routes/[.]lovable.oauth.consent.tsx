import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Navigateur uniquement : la session Supabase vit dans localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({
    search,
    location,
  }: {
    search: Record<string, string>;
    location: { pathname: string; searchStr: string; search: string };
  }) => {
    if (!search.authorization_id) throw new Error("authorization_id manquant");
    const session = await getOrRefreshSession();
    const next = location.pathname + location.searchStr;
    if (!session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({
    location,
  }: {
    location: { pathname: string; searchStr: string; search: string };
  }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const oauth = (
      supabase.auth as unknown as {
        oauth: {
          getAuthorizationDetails: (
            id: string,
          ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
        };
      }
    ).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("oauth.load_error")} : {String((error as Error)?.message ?? error)}
        </p>
      </main>
    );
  },
});

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

function Consent() {
  const { t } = useTranslation();
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? t("oauth.this_app");

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (
      supabase.auth as unknown as {
        oauth: {
          approveAuthorization: (
            id: string,
          ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
          denyAuthorization: (
            id: string,
          ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
        };
      }
    ).oauth;
    const { data, error: decisionError } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune redirection renvoyée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated space-y-4">
        <h1 className="font-display text-xl font-bold">
          {t("oauth.authorize_title", { name: clientName })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("oauth.authorize_desc", { name: clientName })}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {t("oauth.authorize_btn")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50"
          >
            {t("oauth.deny_btn")}
          </button>
        </div>
      </div>
    </main>
  );
}
