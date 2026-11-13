import { Link } from "@tanstack/react-router";
import logoHorizontal from "@/assets/movespot-logo-horizontal.png.asset.json";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      /* clear space: px-1 py-0.5 so nothing touches the logo edges
         no overflow-hidden — never clip the logo */
      className="inline-flex shrink-0 items-center gap-2 rounded-lg px-1 py-1.5 select-none"
    >
      <img
        src={logoHorizontal.url}
        alt="MoveSpot"
        width={320}
        height={80}
        className="h-12 sm:h-14 w-auto shrink-0 object-contain pointer-events-none"
      />
    </Link>
  );
}
