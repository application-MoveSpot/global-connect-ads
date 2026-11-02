import { useState } from "react";
import { TrendingUp, Zap, ChevronRight, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillBadge } from "@/components/shared/SkillBadge";
import { SkillSelector } from "@/components/shared/SkillSelector";
import type { Skill, VehicleSkillRow } from "@/lib/skills/types";

type VehicleSummary = {
  id: string;
  name: string;
  type: string;
  price_per_day: number;
  skills: VehicleSkillRow[];
};

type Props = {
  vehicle: VehicleSummary;
  catalog: Skill[];
  // Revenu mensuel estimé sans skills — la baseline pour calculer le gain potentiel
  baseMonthlyRevenue?: number;
};

// Calcule le gain potentiel si l'owner active tous les skills disponibles
function computeRevenueLift(
  activeSkills: Skill[],
  allCatalogSkills: Skill[],
  base: number,
): { current: number; potential: number; activatedPct: number } {
  const activeSlugs = new Set(activeSkills.map((s) => s.slug));

  // Cumul des boosts actifs (simplifié, non composé pour rester honnête)
  const activeBoost = activeSkills.reduce((sum, s) => sum + s.revenue_boost_pct, 0);

  // Cumul des boosts si tout était activé
  const maxBoost = allCatalogSkills.reduce((sum, s) => sum + s.revenue_boost_pct, 0);

  return {
    current: Math.round(base * (1 + activeBoost / 100)),
    potential: Math.round(base * (1 + maxBoost / 100)),
    activatedPct:
      allCatalogSkills.length > 0
        ? Math.round((activeSlugs.size / allCatalogSkills.length) * 100)
        : 0,
  };
}

export function SkillsDashboard({ vehicle, catalog, baseMonthlyRevenue = 800 }: Props) {
  const [editing, setEditing] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(
    vehicle.skills.map((vs) => vs.skill_id),
  );

  const activeSkills = catalog.filter((s) => activeSkillIds.includes(s.id));
  const inactiveSkills = catalog.filter((s) => !activeSkillIds.includes(s.id));

  // Suggestions : les skills inactifs avec le meilleur ROI
  const topSuggestions = [...inactiveSkills]
    .sort((a, b) => b.revenue_boost_pct - a.revenue_boost_pct)
    .slice(0, 3);

  const { current, potential, activatedPct } = computeRevenueLift(
    activeSkills,
    catalog,
    baseMonthlyRevenue,
  );

  const totalGain = potential - current;

  return (
    <div className="space-y-5">
      {/* ── Revenus card ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Revenus estimés ce mois
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {current.toLocaleString("fr-FR")} €
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Base : {baseMonthlyRevenue} € · +
              {activeSkills.reduce((s, sk) => s + sk.revenue_boost_pct, 0)}% grâce à vos compétences
            </p>
          </div>

          {/* Potentiel si tout est activé */}
          <div className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Potentiel max</p>
            <p className="text-xl font-bold text-emerald-600">
              {potential.toLocaleString("fr-FR")} €
            </p>
            <p className="text-[10px] text-emerald-600/70">+{totalGain} €/mois</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Profil complété à {activatedPct}%</span>
            <span className="text-xs font-medium text-emerald-600">
              {activeSkills.length}/{catalog.length} compétences
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${activatedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Skills actifs ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Compétences actives</h3>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="text-xs text-primary hover:underline"
          >
            {editing ? "Fermer" : "Modifier"}
          </button>
        </div>

        {activeSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            Aucune compétence activée — cliquez sur "Modifier" pour commencer.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeSkills.map((skill) => (
              <SkillBadge key={skill.id} skill={skill} selected readOnly showRevenueBadge />
            ))}
          </div>
        )}
      </div>

      {/* ── Éditeur inline ────────────────────────────────────────── */}
      {editing && (
        <div className="rounded-xl border border-border bg-secondary/30 p-5">
          <SkillSelector
            targetId={vehicle.id}
            mode="vehicle"
            catalog={catalog}
            initialSelectedIds={activeSkillIds}
            onSaved={(ids) => {
              setActiveSkillIds(ids);
              setEditing(false);
            }}
          />
        </div>
      )}

      {/* ── Suggestions ROI ───────────────────────────────────────── */}
      {!editing && topSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="font-semibold text-sm">Débloquez plus de revenus</h3>
          </div>

          <div className="space-y-2">
            {topSuggestions.map((skill) => (
              <div
                key={skill.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border",
                  "bg-background px-4 py-3 gap-3",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{skill.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    +{skill.revenue_boost_pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                  >
                    Activer <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lock : skills admin-only ───────────────────────────────── */}
      {inactiveSkills.some((s) => s.revenue_boost_pct >= 20) && !editing && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
          <p>
            Certaines compétences premium (ex : Transport VIP, LED Dynamique) nécessitent une
            validation par notre équipe.{" "}
            <a href="/owner/profil" className="text-primary hover:underline">
              Déposer une demande →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
