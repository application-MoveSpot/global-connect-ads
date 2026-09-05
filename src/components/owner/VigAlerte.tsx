/**
 * Bandeau d'alerte de vigilance Urssaf pour le tableau de bord propriétaire.
 * S'affiche automatiquement dès que vigilance_statut = "BLOQUE" ou si le seuil
 * de 5 000 € est proche (avertissement préventif).
 */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyVigilanceStatus,
  submitAttestationUrssaf,
  VIGILANCE_SEUIL_CENTIMES,
} from "@/lib/payments/vigilance.functions";

type VigilanceInfo = Awaited<ReturnType<typeof getMyVigilanceStatus>>;

// ─── Icônes inline SVG (pas de dépendance externe) ───────────────────────────

function IconWarning({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

// ─── Barre de progression des gains ──────────────────────────────────────────

function GainsProgress({ gainsCentimes }: { gainsCentimes: number }) {
  const pct = Math.min(100, (gainsCentimes / VIGILANCE_SEUIL_CENTIMES) * 100);
  const gainsEuros = (gainsCentimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const seuilEuros = (VIGILANCE_SEUIL_CENTIMES / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span>Gains cumulés : <strong>{gainsEuros}</strong></span>
        <span className="text-muted-foreground">Seuil légal : {seuilEuros}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Zone d'upload de l'attestation ──────────────────────────────────────────

function UploadAttestation({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const submitFn = useServerFn(submitAttestationUrssaf);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validation côté client : PDF ou image, max 10 Mo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErreur("Format non supporté. Utilisez un PDF ou une image (JPG, PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErreur("Fichier trop volumineux (max 10 Mo).");
      return;
    }

    setUploading(true);
    setErreur(null);

    try {
      // Upload dans le bucket Supabase Storage "attestations-urssaf"
      // Chemin : <user_id>/<timestamp>-<nom_fichier>
      const ext = file.name.split(".").pop() ?? "pdf";
      const storagePath = `${userId}/${Date.now()}-attestation-urssaf.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attestations-urssaf")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Enregistrer le chemin en base via la server function
      await submitFn({ data: { storagePath } });
      onSuccess();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'envoi.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* Zone de dépôt cliquable */}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-border bg-card/60 px-6 py-8 text-center hover:border-primary/50 hover:bg-primary/5 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <IconUpload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          {uploading ? "Envoi en cours…" : "Cliquez pour sélectionner votre attestation"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 10 Mo</p>
      </button>

      {erreur && (
        <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">{erreur}</p>
      )}

      <div className="rounded-xl bg-secondary/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Comment obtenir votre attestation Urssaf ?</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Connectez-vous sur <strong>urssaf.fr</strong></li>
          <li>Rendez-vous dans « Mon compte » → « Attestation de vigilance »</li>
          <li>Téléchargez le document PDF (valable 6 mois)</li>
          <li>Déposez-le ici — validation sous 48 h ouvrées</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function VigAlerte() {
  const fetchStatus = useServerFn(getMyVigilanceStatus);
  const [info, setInfo] = useState<VigilanceInfo>(null);
  const [chargement, setChargement] = useState(true);
  const [soumis, setSoumis] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Récupérer l'id utilisateur courant
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const charger = () => {
    setChargement(true);
    fetchStatus()
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
  }, [fetchStatus]);

  // Rien à afficher si l'utilisateur n'est pas propriétaire ou si les données
  // ne sont pas encore chargées
  if (chargement || !info) return null;

  // ── Avertissement préventif : seuil > 80 % mais pas encore BLOQUE ──────────
  const pct = (info.gainsCentimes / VIGILANCE_SEUIL_CENTIMES) * 100;
  if (info.statut === "EN_ATTENTE" && pct >= 80 && pct < 100) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <IconWarning className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Préparez votre attestation Urssaf</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Vous approchez du seuil légal de 5 000 €. Dès que vous l'atteignez, vos virements seront suspendus
              jusqu'à validation de votre attestation de vigilance Urssaf.
            </p>
          </div>
        </div>
        <GainsProgress gainsCentimes={info.gainsCentimes} />
      </div>
    );
  }

  // ── Compte BLOQUE ──────────────────────────────────────────────────────────
  if (info.statut === "BLOQUE") {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
        {/* En-tête */}
        <div className="flex items-start gap-3">
          <IconWarning className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-destructive">Virements suspendus — Attestation Urssaf requise</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vous avez dépassé <strong>5 000 € de gains</strong> sur MoveSpot. En vertu de l'article L.8222-1 du
              Code du travail, nous sommes tenus de vérifier votre attestation de vigilance Urssaf avant de
              débloquer vos prochains reversements.
            </p>
          </div>
        </div>

        <GainsProgress gainsCentimes={info.gainsCentimes} />

        {/* Étapes */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          {[
            { num: "1", label: "Téléchargez votre attestation sur urssaf.fr" },
            { num: "2", label: "Déposez-la ci-dessous" },
            { num: "3", label: "Validation sous 48 h — virements débloqués" },
          ].map((e) => (
            <div key={e.num} className="rounded-xl border border-border bg-card p-3">
              <div className="w-7 h-7 mx-auto rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mb-1.5">
                {e.num}
              </div>
              <p className="text-muted-foreground leading-snug">{e.label}</p>
            </div>
          ))}
        </div>

        {/* Zone d'upload ou confirmation */}
        {soumis ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <IconCheck className="h-4 w-4 shrink-0" />
            Attestation envoyée — notre équipe la vérifie sous 48 h ouvrées.
            Vous recevrez une notification dès que vos virements seront débloqués.
          </div>
        ) : (
          userId && (
            <UploadAttestation
              userId={userId}
              onSuccess={() => {
                setSoumis(true);
                charger();
              }}
            />
          )
        )}

        {/* Note légale */}
        <p className="text-xs text-muted-foreground">
          Cette obligation s'applique à tout cocontractant professionnel dont la prestation dépasse 5 000 € HT
          sur une année civile (Art. L.8222-1 et R.8222-1 du Code du travail). Sans attestation valide,
          MoveSpot encourt une responsabilité solidaire pour le paiement des cotisations sociales dues.
        </p>
      </div>
    );
  }

  // ── Statut VALIDE ──────────────────────────────────────────────────────────
  if (info.statut === "VALIDE") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-5 py-3.5">
        <IconCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Attestation Urssaf validée — virements actifs.{" "}
          {info.dateVerification && (
            <span className="font-normal text-muted-foreground">
              Validée le {new Date(info.dateVerification).toLocaleDateString("fr-FR")}
            </span>
          )}
        </p>
      </div>
    );
  }

  // EN_ATTENTE et sous le seuil : rien à afficher
  return null;
}
