import { useState } from 'react';
import { useDynamicCampaignPrice } from '@/hooks/useDynamicCampaignPrice';

export function BriefCreationForm() {
  const [basePrice] = useState(500);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Ne déclenche la requête que si région + dates sont renseignées
  const pricingParams =
    selectedRegionId && startDate && endDate
      ? { basePrice, regionId: selectedRegionId, startDate, endDate }
      : null;

  const { data: priceData, isLoading, isError } = useDynamicCampaignPrice(pricingParams);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Formulaire de configuration */}
      <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Configurer mon Brief de Campagne</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zone Géographique</label>
          <select
            onChange={(e) => setSelectedRegionId(e.target.value || null)}
            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Sélectionnez une région...</option>
            <option value="paris-id-uuid">Paris Centre</option>
            <option value="lyon-id-uuid">Lyon Métropole</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Récapitulatif et Prix Dynamique */}
      <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg h-fit space-y-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold">Estimation Budgétaire</h3>
          <p className="text-xs text-gray-400 mt-1">
            Le tarif est ajusté de manière programmatique selon l'affluence de la zone et la disponibilité de la flotte.
          </p>
        </div>

        <div className="py-4 border-y border-gray-800">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              <p className="text-xs text-gray-400">Calcul du meilleur tarif en cours...</p>
            </div>
          )}

          {!isLoading && !priceData && !isError && (
            <p className="text-sm text-gray-400 text-center py-4">
              Renseignez une zone et des dates pour afficher le prix de votre campagne.
            </p>
          )}

          {isError && (
            <p className="text-sm text-red-400 text-center py-4">
              Erreur lors de l'estimation. Veuillez vérifier vos dates.
            </p>
          )}

          {!isLoading && priceData != null && (
            <div className="text-center">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Montant Estimé</span>
              <p className="text-4xl font-black text-white mt-1 tabular-nums">{priceData.toFixed(2)} €</p>
              <p className="text-[10px] text-emerald-400 mt-2 flex items-center justify-center gap-1">
                <span>⚡</span> Indexé en temps réel via MoveSpot Yield
              </p>
            </div>
          )}
        </div>

        <button
          disabled={priceData == null || isLoading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors shadow-md text-sm"
        >
          Valider et Payer le Brief
        </button>
      </div>
    </div>
  );
}
