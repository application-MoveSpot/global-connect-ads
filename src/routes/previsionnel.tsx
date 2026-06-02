import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/previsionnel")({
  component: PrevisionnelPage,
  head: () => ({
    meta: [
      { title: "Prévisionnel 5 ans — MoveSpot" },
      { name: "description", content: "Prévisionnel financier MoveSpot sur 5 ans, version imprimable." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const years = ["Année 1", "Année 2", "Année 3", "Année 4", "Année 5"];
const structure = ["Micro-BIC", "Micro-BIC", "SASU (IS)", "SASU (IS)", "SASU (IS)"];

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";
const pct = (n: number) => (n * 100).toFixed(1) + " %";
const txt = ((s: unknown) => String(s)) as unknown as (n: number) => string;

// Commission MoveSpot (CA réel — flux propriétaires hors CA grâce au mandat d'encaissement Stripe Connect)
const commission = [11286, 57564, 200621, 480168, 901836];
const gmv = [37620, 191880, 668736, 1600560, 3006120];
const reversement = [26334, 134316, 468115, 1120392, 2104284];

// Charges décaissées (mêmes flux cash quelle que soit la structure)
const chargesCash = [6137, 16054, 75637, 167610, 298510];

// Micro (années 1-2) : URSSAF 21,2 % du CA + versement libératoire 1,7 % du CA
const urssaf = [Math.round(11286 * 0.212), Math.round(57564 * 0.212), 0, 0, 0];
const versLib = [Math.round(11286 * 0.017), Math.round(57564 * 0.017), 0, 0, 0];

// SASU (années 3-5) : IS 25 % sur résultat avant impôt (commission - charges)
const ebitdaSASU = [0, 0, commission[2] - chargesCash[2], commission[3] - chargesCash[3], commission[4] - chargesCash[4]];
const isSASU = [0, 0, Math.round(ebitdaSASU[2] * 0.25), Math.round(ebitdaSASU[3] * 0.25), Math.round(ebitdaSASU[4] * 0.25)];

// Résultat net / cash net annuel
const resultatNet = years.map((_, i) => {
  if (i < 2) return commission[i] - chargesCash[i] - urssaf[i] - versLib[i];
  return ebitdaSASU[i] - isSASU[i];
});

// Marge nette
const margeNette = resultatNet.map((r, i) => r / commission[i]);

// Trésorerie
const apport = 15000;
const tresoFin: number[] = [];
let acc = apport;
for (let i = 0; i < 5; i++) {
  acc += resultatNet[i];
  tresoFin.push(acc);
}

const synthese: Array<[string, (string | number)[], (n: number) => string]> = [
  ["Structure juridique", structure as any, txt as any],
  ["Véhicules partenaires en diffusion (moy.)", [15, 60, 180, 380, 650], (n) => n.toString()],
  ["GMV — facturé aux annonceurs", gmv, fmt],
  ["Reversé aux propriétaires (flux passant, hors CA)", reversement, fmt],
  ["Commission MoveSpot = CA réel", commission, fmt],
  ["Charges d'exploitation", chargesCash, fmt],
  ["URSSAF micro (21,2 % du CA)", urssaf, fmt],
  ["Versement libératoire IR (1,7 % du CA)", versLib, fmt],
  ["Impôt sur les sociétés (25 %)", isSASU, fmt],
  ["Résultat net (cash après impôts)", resultatNet, fmt],
  ["Marge nette / CA", margeNette, pct],
  ["Trésorerie fin de période", tresoFin, fmt],
];

const hypotheses: Array<{ section?: string; row?: [string, (string | number)[], (n: number) => string] }> = [
  { section: "STRUCTURE JURIDIQUE" },
  { row: ["Régime applicable", structure, txt] },
  { row: ["Seuil micro-BIC prestations services", ["77 700 €", "77 700 €", "dépassé", "dépassé", "dépassé"], txt] },
  { row: ["Franchise en base TVA (39 100 €)", ["OK", "TVA due", "TVA due", "TVA due", "TVA due"], txt] },
  { section: "MANDAT D'ENCAISSEMENT (Stripe Connect)" },
  { row: ["GMV transitant (hors CA)", gmv, fmt] },
  { row: ["Reversé aux propriétaires (flux passant)", reversement, fmt] },
  { row: ["Take rate / commission MoveSpot", [0.3, 0.3, 0.3, 0.3, 0.3], pct] },
  { section: "OFFRE — VÉHICULES PARTENAIRES" },
  { row: ["Véhicules en diffusion (moyenne)", [15, 60, 180, 380, 650], (n) => n.toString()] },
  { row: ["Taux d'occupation", [0.55, 0.65, 0.72, 0.78, 0.82], pct] },
  { section: "DEMANDE — ANNONCEURS" },
  { row: ["Prix mensuel facturé / véhicule (€ HT)", [380, 410, 430, 450, 470], fmt] },
  { section: "COÛTS DÉCAISSÉS (cash réel, hors fiscalité)" },
  { row: ["Salaires & charges (an)", [0, 0, 30000, 72000, 132000], fmt] },
  { row: ["Loyer & frais bureau", [0, 0, 3000, 7200, 14400], fmt] },
  { row: ["Outils & SaaS", [1440, 2400, 4800, 8400, 13200], fmt] },
  { row: ["Frais bancaires & assurances", [720, 1200, 2400, 4200, 6600], fmt] },
  { row: ["Comptable & juridique", [1800, 3000, 5400, 9000, 13200], fmt] },
  { row: ["Marketing & acquisition", [1500, 6000, 18000, 38000, 65000], fmt] },
  { row: ["Frais Stripe (1,8 % du GMV)", [677, 3454, 12037, 28810, 54110], fmt] },
  { section: "FISCALITÉ" },
  { row: ["Cotisations URSSAF micro (21,2 %)", urssaf, fmt] },
  { row: ["Versement libératoire IR (1,7 %)", versLib, fmt] },
  { row: ["Impôt sur les sociétés (25 %)", isSASU, fmt] },
];

const compteResultat: Array<{ section?: string; row?: [string, (number | string)[], (n: number) => string]; bold?: boolean }> = [
  { section: "VOLUME MARKETPLACE (information — hors CA grâce au mandat)" },
  { row: ["GMV facturé aux annonceurs", gmv, fmt] },
  { row: ["Reversé aux propriétaires (flux passant)", reversement, fmt] },
  { section: "CHIFFRE D'AFFAIRES MOVESPOT" },
  { row: ["Commission (take rate 30 % × GMV) = CA", commission, fmt], bold: true },
  { section: "CHARGES D'EXPLOITATION DÉCAISSÉES" },
  { row: ["Salaires & charges", [0, 0, 30000, 72000, 132000], fmt] },
  { row: ["Loyer & frais bureau", [0, 0, 3000, 7200, 14400], fmt] },
  { row: ["Outils & SaaS", [1440, 2400, 4800, 8400, 13200], fmt] },
  { row: ["Frais bancaires & assurances", [720, 1200, 2400, 4200, 6600], fmt] },
  { row: ["Comptable & juridique", [1800, 3000, 5400, 9000, 13200], fmt] },
  { row: ["Marketing & acquisition", [1500, 6000, 18000, 38000, 65000], fmt] },
  { row: ["Frais Stripe (sur GMV)", [677, 3454, 12037, 28810, 54110], fmt] },
  { row: ["Total charges décaissées", chargesCash, fmt], bold: true },
  { section: "FISCALITÉ & COTISATIONS (selon régime)" },
  { row: ["URSSAF micro (21,2 % du CA — A1 & A2 uniquement)", urssaf, fmt] },
  { row: ["Versement libératoire IR (1,7 % du CA — A1 & A2)", versLib, fmt] },
  { row: ["Impôt sur les sociétés (25 % — SASU A3 à A5)", isSASU, fmt] },
  { section: "RÉSULTAT NET" },
  { row: ["Résultat net (cash après fiscalité)", resultatNet, fmt], bold: true },
  { row: ["Marge nette / CA", margeNette, pct] },
];

const tresorerie: Array<{ section?: string; row?: [string, (number | string)[], (n: number) => string] }> = [
  { section: "FINANCEMENT INITIAL" },
  { row: ["Apport personnel / fondateurs", [apport, "—", "—", "—", "—"], fmt] },
  { section: "FLUX DE TRÉSORERIE (hors reversement propriétaires, hors CA)" },
  { row: ["Trésorerie début de période", [apport, tresoFin[0], tresoFin[1], tresoFin[2], tresoFin[3]], fmt] },
  { row: ["(+) Commission encaissée", commission, fmt] },
  { row: ["(-) Charges d'exploitation", chargesCash.map((c) => -c), fmt] },
  { row: ["(-) URSSAF micro", urssaf.map((c) => -c), fmt] },
  { row: ["(-) Versement libératoire IR", versLib.map((c) => -c), fmt] },
  { row: ["(-) Impôt sur les sociétés", isSASU.map((c) => -c), fmt] },
  { row: ["Flux net de période", resultatNet, fmt] },
  { row: ["Trésorerie fin de période", tresoFin, fmt] },
];

function BarChart({ title, data, color }: { title: string; data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="mb-6">
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="flex items-end gap-3 h-40 border-b border-l border-gray-300 pb-1 pl-1">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="text-[10px] mb-1 font-medium">{fmt(v)}</div>
            <div
              className="w-full rounded-t"
              style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 2 }}
            />
            <div className="text-[10px] mt-1 text-gray-600">A{i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ section?: string; row?: [string, (number | string)[], (n: number) => string]; bold?: boolean }>;
}) {
  return (
    <div className="mb-8 avoid-break">
      <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border border-gray-300">Poste</th>
            {years.map((y, i) => (
              <th key={y} className="text-right p-2 border border-gray-300">
                {y}
                <div className="text-[9px] font-normal text-gray-500">{structure[i]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            r.section ? (
              <tr key={i} className="bg-gray-50">
                <td colSpan={6} className="p-2 border border-gray-300 font-semibold text-[11px] uppercase tracking-wide text-gray-700">
                  {r.section}
                </td>
              </tr>
            ) : r.row ? (
              <tr key={i} className={r.bold ? "font-bold bg-yellow-50" : ""}>
                <td className="p-2 border border-gray-300">{r.row[0]}</td>
                {r.row[1].map((v, j) => (
                  <td key={j} className="p-2 border border-gray-300 text-right tabular-nums">
                    {typeof v === "number" ? r.row![2](v) : v}
                  </td>
                ))}
              </tr>
            ) : null
          )}
        </tbody>
      </table>
    </div>
  );
}

function PrevisionnelPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .avoid-break { break-inside: avoid; }
        }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">Version imprimable du prévisionnel</div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm font-semibold"
          >
            🖨️ Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <header className="mb-8 border-b border-gray-300 pb-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold">MoveSpot — Prévisionnel 5 ans</h1>
          <p className="text-sm text-gray-600 mt-2">
            Marketplace d'intermédiation : propriétaires de véhicules ↔ annonceurs. MoveSpot perçoit
            uniquement une commission (take rate 30 %) sur le GMV.
          </p>
          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 text-xs text-gray-800">
            <strong>Hypothèses de structure&nbsp;:</strong>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Années 1-2 : <strong>micro-entreprise BIC prestations de services</strong> (URSSAF 21,2 % + versement libératoire IR 1,7 %).</li>
              <li>Bascule en <strong>SASU (IS 25 %)</strong> en année 3 — le CA dépasse le seuil micro de 77 700 €.</li>
              <li><strong>Mandat d'encaissement via Stripe Connect</strong> : seule la commission constitue le CA ; le reversement aux propriétaires est un flux passant.</li>
            </ul>
          </div>
        </header>

        <section className="mb-10 avoid-break">
          <h2 className="font-display text-2xl font-bold mb-4">Synthèse</h2>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border border-gray-300">Indicateur</th>
                {years.map((y, i) => (
                  <th key={y} className="text-right p-2 border border-gray-300">
                    {y}
                    <div className="text-[9px] font-normal text-gray-500">{structure[i]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {synthese.map(([label, vals, formatter], i) => (
                <tr key={i} className={label === "Résultat net (cash après impôts)" || label === "Trésorerie fin de période" ? "font-bold bg-yellow-50" : ""}>
                  <td className="p-2 border border-gray-300">{label}</td>
                  {vals.map((v, j) => (
                    <td key={j} className="p-2 border border-gray-300 text-right tabular-nums">
                      {typeof v === "number" ? formatter(v) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10 avoid-break">
          <h2 className="font-display text-2xl font-bold mb-4">Graphiques</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <BarChart title="GMV (volume facturé aux annonceurs)" data={gmv} color="#3b82f6" />
            <BarChart title="CA MoveSpot (commission)" data={commission} color="#10b981" />
            <BarChart title="Résultat net après fiscalité" data={resultatNet} color="#f59e0b" />
            <BarChart title="Trésorerie fin de période" data={tresoFin} color="#8b5cf6" />
          </div>
        </section>

        <Table title="Hypothèses" rows={hypotheses} />
        <Table title="Compte de résultat" rows={compteResultat} />
        <Table title="Trésorerie & financement" rows={tresorerie} />

        <footer className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
          MoveSpot — Document interne. Modèle marketplace : commission uniquement sur le GMV.
          Les flux de reversement aux propriétaires transitent via Stripe Connect en mandat d'encaissement
          et ne constituent pas un revenu de MoveSpot. Bascule micro-entreprise → SASU en année 3
          (dépassement du seuil 77 700 €).
        </footer>
      </div>
    </div>
  );
}
