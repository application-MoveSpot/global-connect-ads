import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/securite")({
  head: () => ({
    meta: [
      { title: "Sécurité — Comment MoveSpot protège vos données" },
      { name: "description", content: "MoveSpot applique RLS, signatures HMAC, chiffrement TLS et bonnes pratiques RGPD pour sécuriser les comptes, les paiements et les données des annonceurs et propriétaires de véhicules." },
      { property: "og:title", content: "Sécurité — Comment MoveSpot protège vos données" },
      { property: "og:description", content: "MoveSpot applique RLS, signatures HMAC, chiffrement TLS et bonnes pratiques RGPD pour sécuriser les comptes, les paiements et les données des annonceurs et propriétaires de véhicules." },
      { property: "og:url", content: "https://move-spot.com/securite" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/securite" }, ...hreflangLinks("/securite")],
  }),
  component: SecuritePage,
});

type Factor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
};

function SecuritePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [friendlyName, setFriendlyName] = useState("Mon authenticator");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate({ to: "/auth" });
      return;
    }
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) setError(error.message);
    else setFactors((data?.all ?? []) as Factor[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendlyName || `Authenticator ${Date.now()}`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnroll({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const verifyEnroll = async () => {
    if (!enroll) return;
    setError("");
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (chErr || !ch) {
      setBusy(false);
      setError(chErr?.message ?? "Erreur lors de la création du challenge");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: ch.id,
      code,
    });
    setBusy(false);
    if (vErr) {
      setError(vErr.message);
      return;
    }
    setEnroll(null);
    setCode("");
    setInfo("Authenticator activé ✅");
    await refresh();
  };

  const cancelEnroll = async () => {
    if (!enroll) return;
    await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    setEnroll(null);
    setCode("");
    await refresh();
  };

  const remove = async (factorId: string) => {
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setInfo("Authenticator retiré.");
      await refresh();
    }
  };

  const totp = factors.filter((f) => f.factor_type === "totp");
  const hasVerified = totp.some((f) => f.status === "verified");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <LogoLink />
          <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour</Link>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">Sécurité du compte</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Activez la double authentification (2FA) avec une application comme Google Authenticator, Microsoft Authenticator ou 1Password.
        </p>

        {error && <div className="mb-4 rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
        {info && <div className="mb-4 rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">{info}</div>}

        <section className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">Authenticator (TOTP)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {hasVerified
              ? "La 2FA est active. Un code à 6 chiffres vous sera demandé à chaque connexion."
              : "Aucun authenticator actif. Ajoutez-en un ci-dessous."}
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <>
              {totp.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {totp.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
                      <div>
                        <div className="font-medium">{f.friendly_name || "Authenticator"}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.status === "verified" ? "Actif" : "En attente de vérification"}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(f.id)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!enroll && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nom de l'appareil</label>
                    <input
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Mon iPhone"
                    />
                  </div>
                  <button
                    onClick={startEnroll}
                    disabled={busy}
                    className="rounded-lg bg-primary text-primary-foreground py-2.5 px-4 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                  >
                    Ajouter un authenticator
                  </button>
                </div>
              )}

              {enroll && (
                <div className="space-y-4 mt-4 rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="text-sm font-medium mb-2">1. Scannez ce QR code dans votre application</p>
                    <img src={enroll.qr} alt="QR code TOTP" className="w-48 h-48 bg-white p-2 rounded-lg" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Ou saisissez manuellement : <code className="font-mono text-foreground break-all">{enroll.secret}</code>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">2. Saisissez le code à 6 chiffres</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="123456"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={verifyEnroll}
                      disabled={busy || code.length !== 6}
                      className="rounded-lg bg-primary text-primary-foreground py-2.5 px-4 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                    >
                      Vérifier et activer
                    </button>
                    <button
                      onClick={cancelEnroll}
                      disabled={busy}
                      className="rounded-lg border border-border py-2.5 px-4 font-semibold hover:bg-secondary transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground mb-2">Comment ça marche ?</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Installez Google Authenticator, Microsoft Authenticator, Authy ou 1Password.</li>
            <li>Scannez le QR code généré ici pour ajouter MoveSpot.</li>
            <li>À chaque connexion, après votre mot de passe, vous saisirez le code à 6 chiffres affiché dans l'app.</li>
            <li>Vous pouvez retirer l'authenticator à tout moment depuis cette page.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
