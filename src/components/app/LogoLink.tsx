import { Link } from "@tanstack/react-router";

/** Portrait logo: icon (SVG pin) above "MoveSpot" text — no PNG, no whitespace. */
export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      className="inline-flex shrink-0 items-center px-1 py-1.5 rounded-lg select-none"
    >
      <span className="flex flex-col items-center gap-[3px] sm:gap-1 h-12 sm:h-16 justify-center leading-none">
        <svg
          viewBox="0 0 64 64"
          className="h-8 sm:h-11 w-auto shrink-0 pointer-events-none"
          aria-hidden="true"
        >
          <path d="M32 59C21 46 7 36 7 22C7 13 18.6 5 32 5C45.4 5 57 13 57 22C57 36 43 46 32 59Z" fill="#F05A28"/>
          <circle cx="32" cy="22" r="11" fill="#EFF2F8"/>
          <circle cx="32" cy="22" r="4.5" fill="#F05A28"/>
          <circle cx="20" cy="52" r="7" fill="#0A1628"/>
          <circle cx="20" cy="52" r="4" fill="#CBD5E1"/>
          <circle cx="44" cy="52" r="7" fill="#0A1628"/>
          <circle cx="44" cy="52" r="4" fill="#CBD5E1"/>
        </svg>
        <span className="font-display font-bold text-[13px] sm:text-[15px] leading-none tracking-tight text-header-foreground whitespace-nowrap pointer-events-none">
          MoveSpot
        </span>
      </span>
    </Link>
  );
}
