import { useState } from 'react';

function getOccupancyMultiplier(rate: number) {
  if (rate >= 85) return 1.30;
  if (rate >= 60) return 1.15;
  if (rate < 25)  return 0.85;
  return 1.00;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-purple-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function AdminPricingSimulator() {
  const [basePrice, setBasePrice]               = useState(500);
  const [occupancyRate, setOccupancyRate]       = useState(50);
  const [zoneMultiplier, setZoneMultiplier]     = useState(1.0);
  const [seasonalMultiplier, setSeasonalMultiplier] = useState(1.0);

  const occupancyMultiplier = getOccupancyMultiplier(occupancyRate);
  const simulatedPrice = basePrice * zoneMultiplier * seasonalMultiplier * occupancyMultiplier;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Simulateur de Tarification Dynamique (Yield)</h3>
        <p className="text-xs text-gray-500 mt-1">
          Ajustez les curseurs pour tester l'impact des coefficients sur le prix final d'une campagne.
        </p>
      </div>

      <div className="space-y-5">
        <Slider
          label="Prix de base (€)"
          value={basePrice}
          min={50}
          max={5000}
          step={50}
          format={(v) => `${v} €`}
          onChange={setBasePrice}
        />
        <Slider
          label="Taux d'occupation de la flotte"
          value={occupancyRate}
          min={0}
          max={100}
          step={1}
          format={(v) => `${v} %`}
          onChange={setOccupancyRate}
        />
        <Slider
          label="Coefficient zone géographique"
          value={zoneMultiplier}
          min={0.5}
          max={2.5}
          step={0.05}
          format={(v) => `×${v.toFixed(2)}`}
          onChange={setZoneMultiplier}
        />
        <Slider
          label="Coefficient saisonnalité / événement"
          value={seasonalMultiplier}
          min={0.8}
          max={2.0}
          step={0.05}
          format={(v) => `×${v.toFixed(2)}`}
          onChange={setSeasonalMultiplier}
        />
      </div>

      <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Prix Final Estimé</span>
          <p className="text-3xl font-black text-purple-900 mt-1 tabular-nums">
            {simulatedPrice.toFixed(2)} €
          </p>
        </div>
        <div className="text-right text-xs text-purple-700 space-y-0.5 tabular-nums">
          <p>Zone : ×{zoneMultiplier.toFixed(2)}</p>
          <p>Saison : ×{seasonalMultiplier.toFixed(2)}</p>
          <p>Yield (flotte {occupancyRate} %) : ×{occupancyMultiplier.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
