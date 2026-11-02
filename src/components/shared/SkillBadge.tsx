import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/skills/types";
import {
  Zap,
  ShieldCheck,
  Star,
  Package,
  Accessibility,
  EyeOff,
  Languages,
  Crown,
  Moon,
  Briefcase,
  AlertTriangle,
  HeartPulse,
  Maximize2,
  Monitor,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

// Map icône Lucide par nom — ajouter ici si on étend le catalogue
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  ShieldCheck,
  Star,
  Package,
  Accessibility,
  EyeOff,
  Languages,
  Crown,
  Moon,
  Briefcase,
  AlertTriangle,
  HeartPulse,
  Maximize2,
  Monitor,
  Lightbulb,
  TrendingUp,
};

const CATEGORY_COLORS = {
  vehicule:
    "border-sky-500/40 bg-sky-500/8 text-sky-700 dark:text-sky-300 hover:border-sky-500/70 hover:bg-sky-500/15",
  chauffeur:
    "border-violet-500/40 bg-violet-500/8 text-violet-700 dark:text-violet-300 hover:border-violet-500/70 hover:bg-violet-500/15",
  "espace-pub":
    "border-amber-500/40 bg-amber-500/8 text-amber-700 dark:text-amber-300 hover:border-amber-500/70 hover:bg-amber-500/15",
};

const CATEGORY_COLORS_ACTIVE = {
  vehicule:
    "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-200 shadow-[0_0_0_2px] shadow-sky-500/30",
  chauffeur:
    "border-violet-500 bg-violet-500/20 text-violet-700 dark:text-violet-200 shadow-[0_0_0_2px] shadow-violet-500/30",
  "espace-pub":
    "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-200 shadow-[0_0_0_2px] shadow-amber-500/30",
};

type Props = {
  skill: Skill;
  selected?: boolean;
  onClick?: () => void;
  // Mode "lecture seule" : pas cliquable, affiché sur un profil
  readOnly?: boolean;
  // Affiche le badge +X% revenus si le skill a un boost
  showRevenueBadge?: boolean;
  size?: "sm" | "md";
};

export function SkillBadge({
  skill,
  selected = false,
  onClick,
  readOnly = false,
  showRevenueBadge = false,
  size = "md",
}: Props) {
  const Icon = skill.icon ? (ICON_MAP[skill.icon] ?? Zap) : Zap;
  const cat = skill.category as keyof typeof CATEGORY_COLORS;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        disabled={readOnly}
        onClick={onClick}
        title={skill.description ?? skill.label}
        className={cn(
          // Base
          "relative inline-flex items-center gap-1.5 rounded-full border font-medium",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          // Taille
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
          // Couleur selon catégorie + état
          selected ? CATEGORY_COLORS_ACTIVE[cat] : CATEGORY_COLORS[cat],
          // Interactivité
          readOnly ? "cursor-default" : "cursor-pointer active:scale-95 hover:scale-[1.03]",
          // Animation subtile au select
          selected && "scale-[1.02]",
        )}
      >
        <Icon className={cn("shrink-0", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {skill.label}

        {/* Checkmark discret quand sélectionné */}
        {selected && (
          <span
            className={cn(
              "ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full",
              "transition-all duration-200",
              cat === "vehicule" && "bg-sky-500 text-white",
              cat === "chauffeur" && "bg-violet-500 text-white",
              cat === "espace-pub" && "bg-amber-500 text-white",
            )}
          >
            {/* Mini checkmark SVG inline — pas besoin de dépendance */}
            <svg viewBox="0 0 8 8" className="w-2 h-2" fill="none">
              <path
                d="M1.5 4l2 2 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </button>

      {/* Badge +X% revenus — flottant en haut à droite */}
      {showRevenueBadge && skill.revenue_boost_pct > 0 && (
        <span className="absolute -top-2 -right-1 flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm pointer-events-none">
          <TrendingUp className="w-2 h-2" />+{skill.revenue_boost_pct}%
        </span>
      )}
    </div>
  );
}
