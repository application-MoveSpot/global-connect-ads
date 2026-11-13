import { type ReactNode } from "react";
import { LogoLink } from "@/components/app/LogoLink";

interface AppHeaderProps {
  right?: ReactNode;
  /** Adds no-print class — use on print-preview pages so the header is hidden when printing */
  noPrint?: boolean;
  className?: string;
}

export function AppHeader({ right, noPrint, className }: AppHeaderProps) {
  return (
    <header
      className={[
        "sticky top-0 z-40 border-b border-border light-band backdrop-blur-sm",
        noPrint ? "no-print" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
        <LogoLink />
        {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
      </div>
    </header>
  );
}
