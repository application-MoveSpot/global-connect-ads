import type { ReactNode } from "react";
import { LogoLink } from "@/components/app/LogoLink";

/** Supplies branding to pages without their own branded navigation. */
export function AppBrandShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-brand-shell">
      <header className="app-brand-header sticky top-0 z-40 light-band border-b border-header-border backdrop-blur-sm print:hidden">
        <div className="mx-auto flex max-w-[1700px] items-center px-4 h-16 sm:h-[72px] sm:px-6">
          <LogoLink />
        </div>
      </header>
      <div className="app-page">{children}</div>
    </div>
  );
}