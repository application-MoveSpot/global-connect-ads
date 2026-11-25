import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Mail, ShieldCheck, Clock, AlertTriangle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_public/suppression-compte")({
  head: () => ({
    meta: [
      { title: "Suppression de compte — MoveSpot" },
      { name: "description", content: "Procédure de suppression de votre compte MoveSpot et de vos données personnelles." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SuppressionComptePage,
});

function SuppressionComptePage() {
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("https://formsubmit.co/ajax/contact@move-spot.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `[MoveSpot] Demande de suppression de compte — ${email}`,
          email,
          reason: reason || "(non précisé)",
          _template: "table",
        }),
      });
      if (!res.ok) throw new Error("Envoi échoué");
      setEmailSent(true);
    } catch {
      setError("L'envoi a échoué. Veuillez envoyer un email directement à contact@move-spot.com");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-full bg-destructive/10 p-3">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suppression de compte</h1>
            <p className="text-sm text-muted-foreground">MoveSpot — Garry PALERME, Entrepreneur Individuel</p>
          </div>
        </div>

        {/* Option 1 — Connecté */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Vous avez accès à votre compte</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            La méthode la plus rapide : supprimez directement depuis vos paramètres. Vous pourrez
            vérifier et vider votre portefeuille avant la suppression définitive.
          </p>
          <Link
            to="/parametres"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Accéder à mes paramètres <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Option 2 — Sans connexion */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Vous n'avez plus accès à votre compte</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Envoyez votre demande par email. Notre équipe traitera votre demande dans un délai de{" "}
            <strong>30 jours</strong> conformément au RGPD (art. 17).
          </p>

          {emailSent ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-4 text-emerald-700 dark:text-emerald-300 text-sm">
              ✅ Votre demande a été envoyée. Vous recevrez un accusé de réception à l'adresse{" "}
              <strong>{email}</strong> dans les 48 heures.
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Adresse e-mail du compte à supprimer *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Motif (optionnel)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Je ferme mon compte car…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive text-destructive-foreground px-5 py-2.5 text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {sending ? "Envoi en cours…" : "Envoyer ma demande de suppression"}
              </button>
            </form>
          )}
        </div>

        {/* Ce qui est supprimé */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Ce qui se passe lors de la suppression</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1.5">
                ✅ Données supprimées sous 30 jours
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs pl-2">
                <li>Profil et informations personnelles (nom, email, téléphone, adresse)</li>
                <li>Historique de navigation et préférences de l'application</li>
                <li>Photos de pose/dépose liées à vos campagnes</li>
                <li>Messages et échanges sur la plateforme</li>
                <li>Accès au compte et identifiants de connexion</li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300 text-xs mb-1">
                    Données conservées pour obligations légales
                  </p>
                  <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 space-y-0.5 text-xs">
                    <li>
                      Données de facturation et transactions financières —{" "}
                      <strong>10 ans</strong> (art. L.123-22 C.com., obligation comptable)
                    </li>
                    <li>
                      Récapitulatifs fiscaux DAC7 transmis à l'administration —{" "}
                      <strong>6 ans</strong> (art. L.102 B LPF)
                    </li>
                    <li>
                      Logs de connexion et données de sécurité —{" "}
                      <strong>1 an</strong> (art. R. 10-13 CPCE)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Solde restant :</strong> tout solde positif dans votre portefeuille
              MoveSpot doit être viré avant la suppression. Si vous ne pouvez pas vous
              connecter, mentionnez-le dans votre demande et nous vous recontacterons pour
              procéder au virement.
            </p>
          </div>
        </div>

        {/* Contact DPO */}
        <div className="rounded-2xl border border-border bg-secondary/10 p-5 text-sm text-muted-foreground">
          <p className="mb-1">
            <strong className="text-foreground">Contact DPO / Responsable de traitement :</strong>
          </p>
          <p>
            Garry PALERME, Entrepreneur Individuel — SIREN 804 671 444
            <br />
            1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
            <br />
            <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
              contact@move-spot.com
            </a>
          </p>
          <p className="mt-2 text-xs">
            Conformément au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés,
            vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et
            d'opposition sur vos données personnelles. En cas de réponse insatisfaisante, vous
            pouvez introduire une réclamation auprès de la{" "}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CNIL
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
