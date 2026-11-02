import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillBadge } from "./SkillBadge";
import { setVehicleSkills, setDriverSkills } from "@/lib/skills/skills.functions";
import type { Skill, SkillCategory } from "@/lib/skills/types";

// Labels humains par catégorie
const CATEGORY_LABELS: Record<SkillCategory, { title: string; hint: string }> = {
  vehicule: {
    title: "Spécificités du véhicule",
    hint: "Type d'énergie, certification ZFE, équipements...",
  },
  chauffeur: {
    title: "Quels sont vos points forts ?",
    hint: "Langues, services premium, habilitations...",
  },
  "espace-pub": {
    title: "Votre espace publicitaire",
    hint: "Surface disponible, écran LED, visibilité nocturne...",
  },
};

type Mode = "vehicle" | "driver";

type Props = {
  targetId: string;
  mode: Mode;
  catalog: Skill[];
  // IDs déjà sélectionnés pour pré-remplir
  initialSelectedIds?: string[];
  onSaved?: (selectedIds: string[]) => void;
};

export function SkillSelector({
  targetId,
  mode,
  catalog,
  initialSelectedIds = [],
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const callSetVehicle = useServerFn(setVehicleSkills);
  const callSetDriver = useServerFn(setDriverSkills);

  const toggle = (skillId: string) => {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const skillIds = [...selected];
      if (mode === "vehicle") {
        await callSetVehicle({ data: { vehicleId: targetId, skillIds } });
      } else {
        await callSetDriver({ data: { driverId: targetId, skillIds } });
      }
      setSaved(true);
      onSaved?.(skillIds);
    } finally {
      setSaving(false);
    }
  };

  // Regroupe les skills par catégorie pour l'affichage sectionné
  const byCategory = catalog.reduce<Partial<Record<SkillCategory, Skill[]>>>((acc, skill) => {
    const cat = skill.category;
    (acc[cat] ??= []).push(skill);
    return acc;
  }, {});

  // Les catégories pertinentes selon le mode
  const visibleCategories: SkillCategory[] =
    mode === "vehicle" ? ["vehicule", "espace-pub"] : ["chauffeur"];

  const hasChanges =
    selected.size !== initialSelectedIds.length ||
    [...selected].some((id) => !initialSelectedIds.includes(id));

  return (
    <div className="space-y-6">
      {visibleCategories.map((cat) => {
        const skills = byCategory[cat];
        if (!skills?.length) return null;
        const { title, hint } = CATEGORY_LABELS[cat];

        return (
          <div key={cat} className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <SkillBadge
                  key={skill.id}
                  skill={skill}
                  selected={selected.has(skill.id)}
                  onClick={() => toggle(skill.id)}
                  showRevenueBadge={skill.revenue_boost_pct >= 10}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer avec résumé + bouton save */}
      <div
        className={cn(
          "flex items-center justify-between pt-4 border-t border-border/50",
          "transition-opacity duration-200",
          !hasChanges && !saved && "opacity-60",
        )}
      >
        <span className="text-xs text-muted-foreground">
          {selected.size === 0
            ? "Aucune compétence sélectionnée"
            : `${selected.size} compétence${selected.size > 1 ? "s" : ""} activée${selected.size > 1 ? "s" : ""}`}
        </span>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || (!hasChanges && !saved)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            saved && !hasChanges
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95",
            (saving || (!hasChanges && !saved)) && "opacity-50 cursor-not-allowed",
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement…
            </>
          ) : saved && !hasChanges ? (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Profil mis à jour
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>
    </div>
  );
}
