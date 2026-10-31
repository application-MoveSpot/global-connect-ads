import { Link } from "@tanstack/react-router";
import logoOfficial from "@/assets/movespot-logo.png.asset.json";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      /* clear space: px-1 py-0.5 so nothing touches the logo edges
         no overflow-hidden — never clip the logo */
      className="inline-flex shrink-0 items-center gap-2 rounded-lg px-1 py-0.5 select-none"
    >
      <img
        src={logoOfficial.url}
        alt="MoveSpot"
        width={273}
        height={359}
        className="h-20 w-auto shrink-0 object-contain pointer-events-none"
      />
    </Link>
  );
}
