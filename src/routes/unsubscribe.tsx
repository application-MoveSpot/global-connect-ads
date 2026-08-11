import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

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
      <h1 className="mt-3 font-display text-3xl font-bold">Préférences d'emails</h1>

      {state === "loading" ? (
        <p className="mt-4 text-muted-foreground">Vérification de votre lien…</p>
      ) : null}

      {state === "valid" ? (
        <div className="mt-4 space-y-4">
          <p className="text-muted-foreground">
            Vous êtes sur le point de ne plus recevoir d'emails MoveSpot
            {email ? ` à l'adresse ${email}` : ""}. Les emails liés à la sécurité de votre compte
            continueront d'être envoyés.
          </p>
          <Button onClick={confirm} disabled={busy}>
            {busy ? "Traitement…" : "Confirmer ma désinscription"}
          </Button>
        </div>
      ) : null}

      {state === "done" ? (
        <p className="mt-4 text-muted-foreground">
          C'est fait — vous ne recevrez plus d'emails de notification MoveSpot.
        </p>
      ) : null}

      {state === "used" ? (
        <p className="mt-4 text-muted-foreground">
          Ce lien a déjà été utilisé : vous êtes déjà désinscrit.
        </p>
      ) : null}

      {state === "invalid" ? (
        <p className="mt-4 text-muted-foreground">
          Ce lien de désinscription est invalide ou a expiré.
        </p>
      ) : null}

      {state === "error" ? (
        <p className="mt-4 text-destructive">
          Une erreur est survenue. Merci de réessayer dans quelques instants.
        </p>
      ) : null}
    </main>
  );
}
