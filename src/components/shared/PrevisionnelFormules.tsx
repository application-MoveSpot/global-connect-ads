import { useState } from "react";

/**
 * Simulateur de revenus d'abonnement MoveSpot.
 * Compare un prix unique (42 €/véhicule/mois) à une grille multi-formules
 * dont la moyenne pondérée ressort à 42,50 €/véhicule/mois.
 * MoveSpot conserve 30 % de commission.
 */

const COMMISSION = 0.3;
const PRIX_UNIQUE = 42;

const FORMULES = [
  { nom: "Starter", prix: 29, part: 0.3, detail: "1 véhicule, zone unique" },
  { nom: "Standard", prix: 42, part: 0.5, detail: "Zone étendue + reporting" },
  { nom: "Pro", prix: 59, part: 0.2, detail: "Multi-zones, priorité chauffeurs" },
];

const PRIX_MOYEN_PONDERE = FORMULES.reduce((acc, f) => acc + f.prix * f.part, 0); // 42,50 €

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";

export default function PrevisionnelFormules() {
  const [vehicles, setVehicles] = useState(150);

  const revenueUnique = vehicles * PRIX_UNIQUE * 12 * COMMISSION;
  const revenueFormules = vehicles * PRIX_MOYEN_PONDERE * 12 * COMMISSION;
  const ecart = revenueFormules - revenueUnique;

  return (
    <div className="avoid-break rounded-xl border border-gray-300 bg-white p-6 my-8">
      <h3 className="font-display text-xl font-bold text-gray-900 mb-1">
        🧮 Simulateur d'abonnement
      </h3>
      <p className="text-xs text-gray-600 mb-5">
        Commission MoveSpot de 30 % sur les abonnements véhicules, projetée sur 12 mois.
      </p>

      <div className="mb-6">
        <label
          htmlFor="vehicles-slider"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nombre de véhicules actifs simultanément
        </label>
        <input
          id="vehicles-slider"
          type="range"
          min="10"
          max="2000"
          step="10"
          value={vehicles}
          onChange={(e) => setVehicles(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
        />
        <span className="text-lg font-bold text-gray-900 mt-1 block tabular-nums">
          {vehicles} véhicules
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Scénario 1 — Prix unique
          </p>
          <p className="text-xl font-bold text-gray-900 tabular-nums">
            {eur(revenueUnique)} <span className="text-sm font-medium">/ an</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-1">{PRIX_UNIQUE} € / véhicule / mois</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-[11px] text-emerald-700 uppercase tracking-wide">
            Scénario 2 — Multi-formules
          </p>
          <p className="text-xl font-bold text-emerald-900 tabular-nums">
            {eur(revenueFormules)} <span className="text-sm font-medium">/ an</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">
            {PRIX_MOYEN_PONDERE.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € moyen
            pondéré
          </p>
        </div>
      </div>

      <table className="w-full text-xs border-collapse mb-5">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border border-gray-300">Formule</th>
            <th className="text-left p-2 border border-gray-300">Inclus</th>
            <th className="text-right p-2 border border-gray-300">Prix / mois</th>
            <th className="text-right p-2 border border-gray-300">Mix</th>
            <th className="text-right p-2 border border-gray-300">Véhicules</th>
            <th className="text-right p-2 border border-gray-300">CA MoveSpot / an</th>
          </tr>
        </thead>
        <tbody>
          {FORMULES.map((f) => (
            <tr key={f.nom}>
              <td className="p-2 border border-gray-300 font-semibold">{f.nom}</td>
              <td className="p-2 border border-gray-300 text-gray-600">{f.detail}</td>
              <td className="p-2 border border-gray-300 text-right tabular-nums">{f.prix} €</td>
              <td className="p-2 border border-gray-300 text-right tabular-nums">
                {Math.round(f.part * 100)} %
              </td>
              <td className="p-2 border border-gray-300 text-right tabular-nums">
                {Math.round(vehicles * f.part)}
              </td>
              <td className="p-2 border border-gray-300 text-right tabular-nums">
                {eur(vehicles * f.part * f.prix * 12 * COMMISSION)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <span className="text-gray-900 font-semibold tabular-nums">
          Gain net annuel pour MoveSpot : +{eur(ecart)}
        </span>
        <span className="block text-[11px] text-gray-600 mt-0.5">
          soit +{((ecart / revenueUnique) * 100).toFixed(1)} % de CA à volume identique
        </span>
      </div>
    </div>
  );
}
