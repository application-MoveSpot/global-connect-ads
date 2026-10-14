import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Se désinscrire des emails MoveSpot" },
      {
        name: "description",
        content:
          "Gérez vos préférences d'emails MoveSpot : confirmez votre désinscription des notifications de campagnes publicitaires.",
      },
      { property: "og:title", content: "Se désinscrire des emails MoveSpot" },
      {
        property: "og:description",
        content: "Confirmez votre désinscription des emails MoveSpot en un clic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

type State = "loading" | "valid" | "invalid" | "used" | "done" | "error";

function UnsubscribePage() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          email?: string;
          used?: boolean;
        };
        if (!res.ok || !body.valid) {
          setState(body.used ? "used" : "invalid");
          return;
        }
        setEmail(body.email ?? null);
        setState("valid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">MoveSpot</p>
      <h1 className="mt-3 font-display text-3xl font-bold">{t("unsubscribe.title")}</h1>

      {state === "loading" ? (
        <p className="mt-4 text-muted-foreground">{t("unsubscribe.loading")}</p>
      ) : null}

      {state === "valid" ? (
        <div className="mt-4 space-y-4">
          <p className="text-muted-foreground">
            {t("unsubscribe.valid_msg", {
              addr: email ? t("unsubscribe.valid_addr", { email }) : "",
            })}
          </p>
          <Button onClick={confirm} disabled={busy}>
            {busy ? t("unsubscribe.processing") : t("unsubscribe.confirm_btn")}
          </Button>
        </div>
      ) : null}

      {state === "done" ? (
        <p className="mt-4 text-muted-foreground">{t("unsubscribe.done")}</p>
      ) : null}

      {state === "used" ? (
        <p className="mt-4 text-muted-foreground">{t("unsubscribe.used")}</p>
      ) : null}

      {state === "invalid" ? (
        <p className="mt-4 text-muted-foreground">{t("unsubscribe.invalid")}</p>
      ) : null}

      {state === "error" ? <p className="mt-4 text-destructive">{t("unsubscribe.error")}</p> : null}
    </main>
  );
}
