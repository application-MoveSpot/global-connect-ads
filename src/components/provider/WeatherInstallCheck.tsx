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
import { useTranslation } from "react-i18next";

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

function extractCity(zone: string): string {
  const first = zone.split(",")[0].trim();
  return first.replace(/\s+\d+(e|er|ème|eme)\b/gi, "").trim() || first;
}

type Props = { zone: string | null };

export function WeatherInstallCheck({ zone }: Props) {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<DayForecast[]>([]);
  const [city, setCity] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const WMO_LABEL: Record<number, string> = {
    0: t("weather_install.wmo_0"), 1: t("weather_install.wmo_1"), 2: t("weather_install.wmo_2"), 3: t("weather_install.wmo_3"),
    45: t("weather_install.wmo_45"), 48: t("weather_install.wmo_48"),
    51: t("weather_install.wmo_51"), 53: t("weather_install.wmo_53"), 55: t("weather_install.wmo_55"),
    61: t("weather_install.wmo_61"), 63: t("weather_install.wmo_63"), 65: t("weather_install.wmo_65"),
    71: t("weather_install.wmo_71"), 73: t("weather_install.wmo_73"), 75: t("weather_install.wmo_75"),
    80: t("weather_install.wmo_80"), 81: t("weather_install.wmo_81"), 82: t("weather_install.wmo_82"),
    85: t("weather_install.wmo_85"), 86: t("weather_install.wmo_86"),
    95: t("weather_install.wmo_95"), 96: t("weather_install.wmo_96"), 99: t("weather_install.wmo_99"),
  };

  const bannerText: Record<Assessment, string> = {
    favorable:   t("weather_install.assessment_favorable"),
    risque:      t("weather_install.assessment_risque"),
    deconseille: t("weather_install.assessment_deconseille"),
  };

  useEffect(() => {
    if (!zone) return;
    const cityName = extractCity(zone);
    setStatus("loading");

    (async () => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`
        );
        const geoJson = await geoRes.json();
        const loc = geoJson.results?.[0];
        if (!loc) { setStatus("error"); return; }

        setCity(loc.name);

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
        {t("weather_install.loading")}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        {t("weather_install.error")}
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

  return (
    <div className={`mt-3 rounded-lg border p-3 ${bannerStyle[globalAssessment]}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span>{bannerIcon[globalAssessment]}</span>
        <span className="text-xs font-semibold">{t("weather_install.header", { city })}</span>
      </div>
      <p className="text-xs mb-2">{bannerText[globalAssessment]}</p>

      <div className="grid grid-cols-3 gap-2">
        {days.map((day) => {
          const a = assess(day);
          const dayLabel = new Date(day.date + "T12:00:00").toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short" });
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
              <div className="text-muted-foreground">{WMO_LABEL[day.weathercode] ?? `Code ${day.weathercode}`}</div>
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
        {t("weather_install.tip")}
      </p>
    </div>
  );
}
