import { useOwnerAnalytics } from '@/hooks/useOwnerAnalytics';

export function OwnerFinancialDashboard() {
  const { data: stats, isLoading } = useOwnerAnalytics();

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Taux d'utilisation */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase">Utilisation Flotte</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-gray-900">{stats?.occupancy_rate}%</span>
          <span className="text-xs text-gray-500">
            ({stats?.active_vehicles}/{stats?.total_vehicles} véhicules)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${stats?.occupancy_rate ?? 0}%` }}
          />
        </div>
      </div>

      {/* Gains cumulés */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase">Gains Total Versés</span>
        <p className="text-3xl font-black text-gray-900 mt-2 tabular-nums">
          {stats?.total_earned.toFixed(2)} €
        </p>
        <p className="text-[10px] text-emerald-600 mt-2">✓ Transféré via Stripe Connect</p>
      </div>

      {/* Revenus projetés */}
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-md">
        <span className="text-xs font-semibold text-purple-300 uppercase">Revenus Projetés (Yield Inc.)</span>
        <p className="text-3xl font-black text-white mt-2 tabular-nums">
          {stats?.projected_revenue.toFixed(2)} €
        </p>
        <p className="text-[10px] text-purple-300 mt-2">
          ⚡ Indexé sur la tarification dynamique en cours
        </p>
      </div>
    </div>
  );
}
