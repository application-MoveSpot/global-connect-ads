/**
 * WeatherInstallCheck — conditions météo pour la pose de vinyle
 *
 * Affiche les prévisions 3 jours pour la zone de la mission.
 * Source : Open-Meteo (gratuit, pas de clé API, CORS ok côté navigateur).
 *
 * Règles d'adhérence vinyle :
 *  ✅ Favorable : temp min ≥ 10 °C, pas de précipitations, vent < 40 km/h
 *  ⚠️ Risqué   : temp min 5–10 °C, ou précip ≤ 2 mm, ou vent 40–60 km/h
 *  ❌ Déconseillé : temp min < 5 °C, ou précip > 2 mm, ou vent > 60 km/h
 */

import { useEffect, useState } from "react";

type DayForecast = {
  date: string;        // ISO date
  tempMin: number;     // °C
  tempMax: number;     // °C
  precipitation: number; // mm
  windspeed: number;   // km/h
  weathercode: number; // WMO code
};

type Assessment = "favorable" | "risque" | "deconseille";

function assess(day: DayForecast): Assessment {
  if (day.tempMin < 5 || day.precipitation > 2 || day.windspeed > 60) return "deconseille";
  if (day.tempMin < 10 || day.precipitation > 0 || day.windspeed > 40) return "risque";
  return "favorable";
}

const WMO_LABEL: Record<number, string> = {
  0: "Ciel dégagé", 1: "Peu nuageux", 2: "Partiellement nuageux", 3: "Couvert",
  45: "Brouillard", 48: "Brouillard givrant",
  51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
  61: "Pluie légère", 63: "Pluie", 65: "Pluie forte",
  71: "Neige légère", 73: "Neige", 75: "Neige forte",
  80: "Averses légères", 81: "Averses", 82: "Averses violentes",
  85: "Averses de neige", 86: "Averses de neige fortes",
  95: "Orage", 96: "Orage avec grêle", 99: "Orage violent avec grêle",
};

function wmoLabel(code: number): string {
  return WMO_LABEL[code] ?? `Code ${code}`;
}

function extractCity(zone: string): string {
  const first = zone.split(",")[0].trim();
  // Retire les suffixes d'arrondissement : "Paris 11e" → "Paris"
  return first.replace(/\s+\d+(e|er|ème|eme)\b/gi, "").trim() || first;
}

type Props = { zone: string | null };

export function WeatherInstallCheck({ zone }: Props) {
  const [days, setDays] = useState<DayForecast[]>([]);
  const [city, setCity] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    if (!zone) return;
    const cityName = extractCity(zone);
    setStatus("loading");

    (async () => {
      try {
        // 1. Géocodage Open-Meteo (gratuit, CORS ok)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`
        );
        const geoJson = await geoRes.json();
        const loc = geoJson.results?.[0];
        if (!loc) { setStatus("error"); return; }

        setCity(loc.name);

        // 2. Prévisions 3 jours
        const fxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
          `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode` +
          `&timezone=Europe%2FParis&forecast_days=3`
        );
        const fxJson = await fxRes.json();
        const d = fxJson.daily;
        const forecast: DayForecast[] = (d.time as string[]).map((date, i) => ({
          date,
          tempMin: d.temperature_2m_min[i],
          tempMax: d.temperature_2m_max[i],
          precipitation: d.precipitation_sum[i],
          windspeed: d.windspeed_10m_max[i],
          weathercode: d.weathercode[i],
        }));
        setDays(forecast);
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [zone]);

  if (!zone || status === "idle") return null;

  if (status === "loading") {
    return (
      <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground animate-pulse">
        Chargement des conditions météo…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        🌫️ Météo indisponible pour cette zone.
      </div>
    );
  }

  const globalAssessment = days.reduce<Assessment>((worst, day) => {
    const a = assess(day);
    if (a === "deconseille") return "deconseille";
    if (a === "risque" && worst !== "deconseille") return "risque";
    return worst;
  }, "favorable");

  const bannerStyle: Record<Assessment, string> = {
    favorable: "border-emerald-500/40 bg-emerald-500/10",
    risque:    "border-amber-500/40 bg-amber-500/10",
    deconseille: "border-destructive/40 bg-destructive/10",
  };
  const bannerIcon: Record<Assessment, string> = {
    favorable:   "✅",
    risque:      "⚠️",
    deconseille: "❌",
  };
  const bannerText: Record<Assessment, string> = {
    favorable:   "Conditions favorables à la pose de vinyle",
    risque:      "Conditions à risque — vérifiez avant d'intervenir",
    deconseille: "Pose déconseillée — conditions défavorables au vinyle",
  };

  return (
    <div className={`mt-3 rounded-lg border p-3 ${bannerStyle[globalAssessment]}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span>{bannerIcon[globalAssessment]}</span>
        <span className="text-xs font-semibold">Météo pose — {city}</span>
      </div>
      <p className="text-xs mb-2">{bannerText[globalAssessment]}</p>

      <div className="grid grid-cols-3 gap-2">
        {days.map((day) => {
          const a = assess(day);
          const dayLabel = new Date(day.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
          const dot: Record<Assessment, string> = {
            favorable:   "bg-emerald-500",
            risque:      "bg-amber-500",
            deconseille: "bg-destructive",
          };
          return (
            <div key={day.date} className="rounded-md border border-border/60 bg-background/60 p-2 text-xs space-y-0.5">
              <div className="flex items-center gap-1 font-semibold text-foreground capitalize">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot[a]}`} />
                {dayLabel}
              </div>
              <div className="text-muted-foreground">{wmoLabel(day.weathercode)}</div>
              <div>{day.tempMin.toFixed(0)}° / {day.tempMax.toFixed(0)} °C</div>
              {day.precipitation > 0 && (
                <div>💧 {day.precipitation.toFixed(1)} mm</div>
              )}
              <div>💨 {day.windspeed.toFixed(0)} km/h</div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Vinyle : adhérence optimale ≥ 10 °C, sans pluie, vent &lt; 40 km/h · Source Open-Meteo
      </p>
    </div>
  );
}
