import { useState, useRef, useCallback } from "react";
import { FileText, Printer, Copy, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── MoveSpot legal identity (matches mentions-legales.tsx) ──────────────────
const MOVESPOT = {
  denomination: "Garry PALERME (EI)",
  forme: "Entrepreneur individuel",
  exploitant: "MoveSpot",
  representant: "Garry PALERME",
  qualite: "Entrepreneur individuel",
  adresse: "1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault (Guadeloupe)",
  siren: "804 671 444",
  siret: "804 671 444 00052",
  tva: "TVA non applicable (art. 293 B CGI — franchise en base)",
  email: "contact@move-spot.com",
  site: "https://move-spot.com",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgentForm {
  nom: string;
  forme: string;
  siret: string;
  adresse: string;
  email: string;
  taux: string;
  dureeCommission: string;
  delaiPaiement: string;
  dureeContrat: string;
  preavis: string;
  lienParrainage: string;
}

const FORMES = [
  "Entrepreneur individuel (EI)",
  "Micro-entreprise",
  "SASU",
  "EURL",
  "SARL",
  "SAS",
  "SA",
  "Autre",
];

const DUREE_COMMISSION_OPTIONS = [
  "12 mois à compter de la première campagne facturée",
  "Première campagne uniquement",
  "24 mois à compter de la première campagne facturée",
  "Durée du contrat",
];

const DEFAULTS: AgentForm = {
  nom: "",
  forme: "Micro-entreprise",
  siret: "",
  adresse: "",
  email: "",
  taux: "15",
  dureeCommission: DUREE_COMMISSION_OPTIONS[0],
  delaiPaiement: "30",
  dureeContrat: "12 mois, renouvelable par tacite reconduction",
  preavis: "15",
  lienParrainage: "",
};

// ─── SIRET validation (Luhn mod 10) ──────────────────────────────────────────
function validateSiret(s: string): boolean {
  const clean = s.replace(/\s/g, "");
  if (!/^\d{14}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(clean[i], 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

// ─── Contract text generator ─────────────────────────────────────────────────
function buildContractText(f: AgentForm, today: string): string {
  const taux = `${f.taux} %`;
  const preavis = `${f.preavis} jours calendaires`;
  const delai = `${f.delaiPaiement} jours`;

  return `
CONTRAT D'APPORTEUR D'AFFAIRES
(Contrat de mise en relation commerciale B2B)

Fait à Baie-Mahault, le ${today}

─────────────────────────────────────────────────────────────────────

ENTRE LES SOUSSIGNÉS :

▌ LE MANDANT

Dénomination sociale : ${MOVESPOT.denomination}
Exploitant la marque : ${MOVESPOT.exploitant}
Forme juridique : ${MOVESPOT.forme}
SIREN : ${MOVESPOT.siren} — SIRET : ${MOVESPOT.siret}
Siège social : ${MOVESPOT.adresse}
Représenté par : ${MOVESPOT.representant}, en sa qualité de ${MOVESPOT.qualite}
Adresse électronique : ${MOVESPOT.email}
Site web : ${MOVESPOT.site}

Ci-après dénommé « MoveSpot »

ET

▌ L'APPORTEUR D'AFFAIRES

Dénomination / Nom : ${f.nom || "___________"}
Forme juridique : ${f.forme}
SIRET : ${f.siret || "___________"}
Adresse postale : ${f.adresse || "___________"}
Adresse électronique : ${f.email || "___________"}
${f.lienParrainage ? `Lien de parrainage MoveSpot : ${f.lienParrainage}` : ""}

Ci-après dénommé « l'Apporteur »

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

═══════════════════════════════════════════════════════════════════════

ARTICLE 1 — OBJET DE LA MISSION

MoveSpot confie à l'Apporteur une mission de mise en relation commerciale simple et non exclusive. L'Apporteur s'engage à présenter à MoveSpot des annonceurs (personnes physiques ou morales) souhaitant lancer des campagnes de publicité mobile via la plateforme MoveSpot, et à promouvoir les services de MoveSpot auprès de ses contacts professionnels.

Le présent contrat ne confère à l'Apporteur aucun mandat de représentation ni aucun pouvoir d'engager MoveSpot à l'égard de tiers. L'Apporteur ne peut ni négocier les conditions tarifaires de MoveSpot, ni signer de contrat au nom de MoveSpot, ni réaliser aucun acte juridique ou commercial au nom et pour le compte de MoveSpot.

═══════════════════════════════════════════════════════════════════════

ARTICLE 2 — INDÉPENDANCE DES PARTIES — ABSENCE DE LIEN DE SUBORDINATION

2.1 Les parties sont et demeurent des entités indépendantes l'une de l'autre. Le présent contrat n'emporte aucune création de société, de GIE, ni aucune relation d'emploi, de mandat salarié ou de subordination juridique entre les parties.

2.2 L'Apporteur exerce son activité commerciale en toute liberté, selon ses propres méthodes et en utilisant les moyens qu'il juge appropriés, sans recevoir d'instructions sur la manière d'exercer son activité, sans être soumis à des horaires ni à des quotas imposés par MoveSpot.

2.3 L'Apporteur déclare disposer d'un statut professionnel indépendant régulièrement constitué, justifié par son numéro SIRET (${f.siret || "fourni en annexe"}). Il est seul responsable de ses obligations fiscales, sociales et administratives. MoveSpot n'effectue aucune retenue à la source sur les commissions versées ; l'Apporteur est responsable de la déclaration de ses revenus auprès des organismes compétents (URSSAF, administration fiscale, etc.).

═══════════════════════════════════════════════════════════════════════

ARTICLE 3 — OBLIGATIONS DE L'APPORTEUR D'AFFAIRES

3.1 Image de marque. L'Apporteur s'engage à représenter MoveSpot de manière loyale et professionnelle. Il utilise exclusivement les supports de communication fournis ou expressément validés par MoveSpot (visuels, présentations, grille tarifaire officielle). Il s'interdit de faire toute promesse tarifaire, de formuler tout engagement de résultat ou de déformer l'offre de service de MoveSpot.

3.2 Conformité RGPD. L'Apporteur traite toutes les données à caractère personnel collectées dans le cadre de son activité de prospection conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés. Il recueille le consentement préalable des prospects avant tout transfert de données à MoveSpot.

3.3 Conformité anti-spam. L'Apporteur respecte l'article L.34-5 du Code des postes et des communications électroniques (CPCE) : toute prospection commerciale par voie électronique est soumise au consentement préalable du destinataire professionnel, sauf exception légale.

3.4 Non-dénigrement. L'Apporteur s'interdit tout discours dénigrant à l'égard de MoveSpot, de ses concurrents ou de ses partenaires.

3.5 Reporting. L'Apporteur informe MoveSpot de tout prospect qu'il introduit, via le lien de parrainage MoveSpot dédié ou par email à ${MOVESPOT.email}, avant toute présentation formelle.

═══════════════════════════════════════════════════════════════════════

ARTICLE 4 — RÉMUNÉRATION ET MODALITÉS DE FACTURATION

4.1 Assiette de la commission. L'Apporteur perçoit une commission de ${taux} calculée sur la commission nette hors taxes (HT) effectivement encaissée par MoveSpot au titre de chaque campagne publicitaire signée par un annonceur apporté par l'Apporteur, déduction faite de tout remboursement, annulation ou litige ayant donné lieu à un reversement à l'annonceur.

4.2 Durée de commissionnement. La commission est due sur toutes les campagnes facturées par l'annonceur apporté pendant une période de ${f.dureeCommission}, à compter de la date de création du compte annonceur sur MoveSpot.

4.3 Modalités de paiement. La commission est versée dans un délai de ${delai} à compter de la réception par MoveSpot d'une facture conforme, émise par l'Apporteur et comportant : sa dénomination sociale, son numéro SIRET, sa forme juridique, le montant HT de la commission, l'assiette de calcul (commission nette HT MoveSpot concernée) et les coordonnées bancaires (IBAN/BIC). Tout défaut de mention obligatoire suspendra le délai de paiement jusqu'à réception d'une facture rectificative.

4.4 Régime fiscal. L'Apporteur déclare relever du régime suivant : ${f.forme}. Les commissions sont exonérées de TVA si l'Apporteur bénéficie de la franchise en base de TVA (art. 293 B CGI) ; dans le cas contraire, la TVA applicable est facturée en sus et remboursée par MoveSpot sur présentation de la facture régulière.

4.5 Aucune commission n'est due sur : (a) les campagnes annulées ou remboursées ; (b) les annonceurs déjà inscrits sur MoveSpot avant la présentation par l'Apporteur ; (c) les annonceurs introduits en violation des articles 3.2 ou 3.3.

═══════════════════════════════════════════════════════════════════════

ARTICLE 5 — CONFIDENTIALITÉ ET NON-DÉTOURNEMENT DE CLIENTÈLE

5.1 Confidentialité. Chaque partie s'engage à tenir strictement confidentiel l'ensemble des informations non publiques reçues de l'autre partie dans le cadre du présent contrat (données commerciales, tarifaires, techniques, financières), pendant toute la durée du contrat et pendant 24 mois suivant son expiration ou résiliation.

5.2 Non-détournement. L'Apporteur s'engage, pendant la durée du contrat et pendant 12 mois après son terme, à ne pas démarcher, conseiller ni contracter directement avec les propriétaires de véhicules, les poseurs certifiés ou les annonceurs clients de MoveSpot, en vue de proposer un service concurrent ou de substitution à celui de MoveSpot.

═══════════════════════════════════════════════════════════════════════

ARTICLE 6 — DURÉE ET RÉSILIATION

6.1 Durée. Le présent contrat est conclu pour une durée de ${f.dureeContrat}, à compter de sa signature par les deux parties.

6.2 Résiliation par préavis. Chacune des parties peut résilier le présent contrat à tout moment, par écrit (email avec accusé de réception ou lettre recommandée avec AR), moyennant un préavis de ${preavis}. Les commissions acquises avant la date effective de résiliation restent dues.

6.3 Résiliation immédiate pour faute. MoveSpot peut résilier le présent contrat de plein droit, sans préavis ni indemnité, en cas de : (a) fraude, fausse déclaration ou manquement grave aux obligations de l'article 3 ; (b) condamnation définitive de l'Apporteur pour une infraction pénale ; (c) liquidation judiciaire ou redressement judiciaire sans reprise d'activité ; (d) défaut de SIRET valide ou de statut professionnel indépendant.

6.4 Effets. La résiliation n'affecte pas les droits et obligations acquis avant sa prise d'effet, notamment les commissions dues au titre de campagnes signées avant le terme.

═══════════════════════════════════════════════════════════════════════

ARTICLE 7 — DROIT APPLICABLE ET JURIDICTION COMPÉTENTE

7.1 Loi applicable. Le présent contrat est régi par le droit français.

7.2 Résolution amiable. En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours à compter de la notification du litige par la partie la plus diligente.

7.3 Tribunal compétent. À défaut de règlement amiable, tout litige relatif à la validité, l'interprétation ou l'exécution du présent contrat sera soumis à la compétence exclusive du Tribunal de commerce de Pointe-à-Pitre ou, à défaut d'existence d'une telle juridiction spécialisée, du Tribunal judiciaire de Pointe-à-Pitre (Guadeloupe), siège social de MoveSpot.

═══════════════════════════════════════════════════════════════════════

ARTICLE 8 — DISPOSITIONS DIVERSES

8.1 Intégralité. Le présent contrat constitue l'intégralité de l'accord entre les parties et se substitue à tout accord antérieur portant sur le même objet.

8.2 Modification. Toute modification du présent contrat doit faire l'objet d'un avenant écrit signé par les deux parties.

8.3 Divisibilité. Si une clause est déclarée nulle ou inapplicable, elle sera réputée non écrite sans affecter les autres stipulations.

8.4 Référence CGU. Le présent contrat est établi en application de l'article 12 bis des Conditions Générales d'Utilisation de la plateforme MoveSpot, disponibles à l'adresse ${MOVESPOT.site}/cgu, que l'Apporteur déclare avoir lues et acceptées.

═══════════════════════════════════════════════════════════════════════

SIGNATURES

Fait en deux exemplaires originaux.

▌ POUR MOVESPOT — Garry PALERME (EI)

Nom : ${MOVESPOT.representant}
Qualité : ${MOVESPOT.qualite}
Date : _____ / _____ / _________
Signature (précédée de la mention « Bon pour accord ») :

___________________________________________


▌ POUR L'APPORTEUR D'AFFAIRES

Nom / Dénomination : ${f.nom || "___________"}
Forme juridique : ${f.forme}
SIRET : ${f.siret || "___________"}
Qualité du signataire : ___________________________________________
Date : _____ / _____ / _________
Signature (précédée de la mention « Bon pour accord ») :

___________________________________________

═══════════════════════════════════════════════════════════════════════

AVERTISSEMENT
Ce modèle de contrat est fourni par MoveSpot à titre opérationnel et informatif. Il ne constitue pas un conseil juridique. MoveSpot recommande de le faire valider par un avocat ou un juriste qualifié avant toute utilisation commerciale. MoveSpot ne saurait être tenu responsable des conséquences d'une utilisation de ce document sans validation préalable par un professionnel du droit.
`.trim();
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SalesAgentContractGenerator() {
  const [form, setForm] = useState<AgentForm>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [siretError, setSiretError] = useState("");
  const contractRef = useRef<HTMLPreElement>(null);

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const contractText = buildContractText(form, today);

  const set = (k: keyof AgentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    if (k === "siret") {
      const clean = val.replace(/\s/g, "");
      setSiretError(
        clean.length === 14 && !validateSiret(clean)
          ? "Numéro SIRET invalide (vérification Luhn échouée)"
          : "",
      );
    }
    setForm((p) => ({ ...p, [k]: val }));
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contractText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
      if (contractRef.current) {
        const range = document.createRange();
        range.selectNodeContents(contractRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }, [contractText]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 print:m-0 print:max-w-none">

      {/* ── Header ── */}
      <div className="print:hidden">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Générateur de contrat d'apporteur d'affaires B2B
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Remplissez le formulaire pour générer le contrat en temps réel. Imprimez ou copiez-le
          une fois complété.
        </p>
      </div>

      {/* ── Disclaimer banner ── */}
      <div className="print:hidden flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Ce modèle est fourni à titre opérationnel. Faites-le valider par un avocat avant toute
          utilisation commerciale.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">

        {/* ── Form ── */}
        <div className="space-y-6">
          <fieldset className="space-y-4 rounded-xl border border-border p-5">
            <legend className="text-sm font-semibold px-1">Identité de l'apporteur</legend>

            <Field label="Nom / Raison sociale *">
              <input
                type="text"
                value={form.nom}
                onChange={set("nom")}
                placeholder="Ex. : DUPONT JEAN / ACME SAS"
                className={inputCls}
              />
            </Field>

            <Field label="Forme juridique *">
              <select value={form.forme} onChange={set("forme")} className={inputCls}>
                {FORMES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Numéro SIRET (14 chiffres) *" error={siretError}>
              <input
                type="text"
                value={form.siret}
                onChange={set("siret")}
                placeholder="12345678901234"
                maxLength={14}
                className={cn(inputCls, siretError && "border-destructive")}
              />
            </Field>

            <Field label="Adresse postale *">
              <input
                type="text"
                value={form.adresse}
                onChange={set("adresse")}
                placeholder="1 rue de la Paix, 75001 Paris"
                className={inputCls}
              />
            </Field>

            <Field label="Adresse email professionnelle *">
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="contact@exemple.fr"
                className={inputCls}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-5">
            <legend className="text-sm font-semibold px-1">Conditions financières</legend>

            <Field label="Taux de commission (%) *">
              <input
                type="number"
                min={1}
                max={50}
                step={0.5}
                value={form.taux}
                onChange={set("taux")}
                className={inputCls}
              />
            </Field>

            <Field label="Durée de commissionnement *">
              <select value={form.dureeCommission} onChange={set("dureeCommission")} className={inputCls}>
                {DUREE_COMMISSION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Délai de paiement après facture conforme (jours) *">
              <input
                type="number"
                min={7}
                max={60}
                value={form.delaiPaiement}
                onChange={set("delaiPaiement")}
                className={inputCls}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-5">
            <legend className="text-sm font-semibold px-1">Durée et résiliation</legend>

            <Field label="Durée du contrat *">
              <input
                type="text"
                value={form.dureeContrat}
                onChange={set("dureeContrat")}
                placeholder="12 mois, renouvelable par tacite reconduction"
                className={inputCls}
              />
            </Field>

            <Field label="Préavis de résiliation (jours calendaires) *">
              <input
                type="number"
                min={7}
                max={90}
                value={form.preavis}
                onChange={set("preavis")}
                className={inputCls}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-5">
            <legend className="text-sm font-semibold px-1">Lien de parrainage (optionnel)</legend>

            <Field label="URL de parrainage MoveSpot">
              <input
                type="url"
                value={form.lienParrainage}
                onChange={set("lienParrainage")}
                placeholder="https://move-spot.com/r/XXXX"
                className={inputCls}
              />
            </Field>
          </fieldset>
        </div>

        {/* ── Live preview ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Aperçu du contrat</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copier le texte
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer / PDF
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-secondary/40 p-4 max-h-[70vh]">
            <pre
              ref={contractRef}
              className="whitespace-pre-wrap font-mono text-xs text-foreground leading-relaxed"
            >
              {contractText}
            </pre>
          </div>
        </div>
      </div>

      {/* ── Print-only full contract ── */}
      <div className="hidden print:block">
        <PrintContract text={contractText} />
      </div>
    </div>
  );
}

// ─── Print layout ─────────────────────────────────────────────────────────────
function PrintContract({ text }: { text: string }) {
  return (
    <>
      {/* Global print styles injected inline so they work inside the admin shell */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 20mm 18mm; }
  body > * { display: none !important; }
  .print\\:block { display: block !important; }
  nav, header, aside, footer, [data-admin-nav], [data-sidebar] { display: none !important; }
}`,
        }}
      />
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-black leading-relaxed">
        {text}
      </pre>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
