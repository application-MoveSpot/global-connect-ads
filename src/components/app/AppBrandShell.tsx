import type { ReactNode } from "react";
import { LogoLink } from "@/components/app/LogoLink";

/** Supplies branding to pages without their own branded navigation. */
export function AppBrandShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-brand-shell">
      <header className="app-brand-header light-band border-b border-header-border print:hidden">
        <div className="mx-auto flex max-w-[1700px] items-center px-4 py-2 sm:px-6">
          <LogoLink />
        </div>
      </header>
      <div className="app-page">{children}</div>
    </div>
  );
}