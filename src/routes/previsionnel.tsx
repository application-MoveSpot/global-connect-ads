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

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";
const pct = (n: number) => (n * 100).toFixed(1) + " %";

const synthese: Array<[string, number[], (n: number) => string]> = [
  ["Véhicules partenaires en diffusion (moy.)", [15, 60, 180, 380, 650], (n) => n.toString()],
  ["GMV — volume facturé aux annonceurs", [37620, 191880, 668736, 1600560, 3006120], fmt],
  ["Reversement aux propriétaires (flux passant)", [26334, 134316, 468115, 1120392, 2104284], fmt],
  ["Take rate (commission MoveSpot)", [0.3, 0.3, 0.3, 0.3, 0.3], pct],
  ["Revenu net MoveSpot (commission)", [11286, 57564, 200621, 480168, 901836], fmt],
  ["Charges totales", [6137, 16054, 75637, 167610, 298510], fmt],
  ["EBITDA", [5149, 41510, 124984, 312558, 603326], fmt],
  ["Marge EBITDA", [0.456, 0.721, 0.623, 0.651, 0.669], pct],
  ["Résultat net", [3862, 31133, 93738, 234418, 452494], fmt],
  ["Trésorerie fin de période", [18862, 49994, 143732, 378150, 830645], fmt],
];

const hypotheses: Array<{ section?: string; row?: [string, (string | number)[], (n: number) => string] }> = [
  { section: "OFFRE — VÉHICULES PARTENAIRES" },
  { row: ["Véhicules en diffusion (moyenne annuelle)", [15, 60, 180, 380, 650], (n) => n.toString()] },
  { row: ["Taux d'occupation", [0.55, 0.65, 0.72, 0.78, 0.82], pct] },
  { section: "DEMANDE — ANNONCEURS" },
  { row: ["Prix mensuel facturé / véhicule (€ HT)", [380, 410, 430, 450, 470], fmt] },
  { section: "COMMISSION MOVESPOT" },
  { row: ["Take rate (commission sur GMV)", [0.3, 0.3, 0.3, 0.3, 0.3], pct] },
  { section: "COÛTS FIXES MENSUELS" },
  { row: ["Salaires & charges", [0, 0, 2500, 6000, 11000], fmt] },
  { row: ["Loyer & frais bureau", [0, 0, 250, 600, 1200], fmt] },
  { row: ["Outils, hébergement, SaaS", [120, 200, 400, 700, 1100], fmt] },
  { row: ["Frais bancaires & assurances", [60, 100, 200, 350, 550], fmt] },
  { row: ["Comptable & juridique", [150, 250, 450, 750, 1100], fmt] },
  { section: "ACQUISITION" },
  { row: ["Budget marketing annuel", [1500, 6000, 18000, 38000, 65000], fmt] },
  { row: ["Frais Stripe (% du GMV)", [0.018, 0.018, 0.018, 0.018, 0.018], pct] },
];

const compteResultat: Array<{ section?: string; row?: [string, number[], (n: number) => string]; bold?: boolean }> = [
  { section: "VOLUME MARKETPLACE (information)" },
  { row: ["GMV — facturé aux annonceurs", [37620, 191880, 668736, 1600560, 3006120], fmt] },
  { row: ["Reversé aux propriétaires (flux passant)", [26334, 134316, 468115, 1120392, 2104284], fmt] },
  { section: "REVENU MOVESPOT" },
  { row: ["Commission MoveSpot (take rate × GMV)", [11286, 57564, 200621, 480168, 901836], fmt], bold: true },
  { section: "CHARGES D'EXPLOITATION" },
  { row: ["Salaires & charges", [0, 0, 30000, 72000, 132000], fmt] },
  { row: ["Loyer & frais bureau", [0, 0, 3000, 7200, 14400], fmt] },
  { row: ["Outils & SaaS", [1440, 2400, 4800, 8400, 13200], fmt] },
  { row: ["Frais bancaires & assurances", [720, 1200, 2400, 4200, 6600], fmt] },
  { row: ["Comptable & juridique", [1800, 3000, 5400, 9000, 13200], fmt] },
  { row: ["Marketing & acquisition", [1500, 6000, 18000, 38000, 65000], fmt] },
  { row: ["Frais Stripe (sur GMV)", [677, 3454, 12037, 28810, 54110], fmt] },
  { row: ["Total charges", [6137, 16054, 75637, 167610, 298510], fmt], bold: true },
  { section: "RÉSULTATS" },
  { row: ["EBITDA", [5149, 41510, 124984, 312558, 603326], fmt], bold: true },
  { row: ["Marge EBITDA", [0.456, 0.721, 0.623, 0.651, 0.669], pct] },
  { row: ["Impôt sur les sociétés (25%)", [-1287, -10378, -31246, -78139, -150831], fmt] },
  { row: ["Résultat net", [3862, 31133, 93738, 234418, 452494], fmt], bold: true },
];

const tresorerie: Array<{ section?: string; row?: [string, (number | string)[], (n: number) => string] }> = [
  { section: "FINANCEMENT INITIAL" },
  { row: ["Apport personnel / fondateurs", [15000, "—", "—", "—", "—"], fmt] },
  { section: "FLUX DE TRÉSORERIE (hors reversement propriétaires)" },
  { row: ["Trésorerie début de période", [15000, 18862, 49994, 143732, 378150], fmt] },
  { row: ["(+) Commission encaissée", [11286, 57564, 200621, 480168, 901836], fmt] },
  { row: ["(-) Charges d'exploitation", [-6137, -16054, -75637, -167610, -298510], fmt] },
  { row: ["(-) Impôt sur les sociétés", [-1287, -10378, -31246, -78139, -150831], fmt] },
  { row: ["Flux net de période", [3862, 31133, 93738, 234418, 452494], fmt] },
  { row: ["Trésorerie fin de période", [18862, 49994, 143732, 378150, 830645], fmt] },
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
            {years.map((y) => (
              <th key={y} className="text-right p-2 border border-gray-300">{y}</th>
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
          <a
            href="/MoveSpot_Previsionnel_5ans.pdf"
            download
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
          >
            PDF original
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <header className="mb-8 border-b border-gray-300 pb-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold">MoveSpot — Prévisionnel 5 ans</h1>
          <p className="text-sm text-gray-600 mt-2">
            Marketplace d'intermédiation : propriétaires de véhicules ↔ annonceurs. MoveSpot perçoit
            uniquement une commission (take rate) sur le GMV.
          </p>
        </header>

        <section className="mb-10 avoid-break">
          <h2 className="font-display text-2xl font-bold mb-4">Synthèse</h2>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border border-gray-300">Indicateur</th>
                {years.map((y) => (
                  <th key={y} className="text-right p-2 border border-gray-300">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {synthese.map(([label, vals, formatter], i) => (
                <tr key={i} className={i === synthese.length - 1 ? "font-bold bg-yellow-50" : ""}>
                  <td className="p-2 border border-gray-300">{label}</td>
                  {vals.map((v, j) => (
                    <td key={j} className="p-2 border border-gray-300 text-right tabular-nums">{formatter(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10 avoid-break">
          <h2 className="font-display text-2xl font-bold mb-4">Graphiques</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <BarChart title="GMV (volume facturé aux annonceurs)" data={[37620, 191880, 668736, 1600560, 3006120]} color="#3b82f6" />
            <BarChart title="Revenu net MoveSpot (commission)" data={[11286, 57564, 200621, 480168, 901836]} color="#10b981" />
            <BarChart title="EBITDA" data={[5149, 41510, 124984, 312558, 603326]} color="#f59e0b" />
            <BarChart title="Trésorerie fin de période" data={[18862, 49994, 143732, 378150, 830645]} color="#8b5cf6" />
          </div>
        </section>

        <Table title="Hypothèses" rows={hypotheses} />
        <Table title="Compte de résultat" rows={compteResultat} />
        <Table title="Trésorerie & financement" rows={tresorerie} />

        <footer className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
          MoveSpot — Document interne. Modèle : commission uniquement sur le GMV. Les flux de
          reversement aux propriétaires transitent par MoveSpot mais ne constituent pas un revenu.
        </footer>
      </div>
    </div>
  );
}
