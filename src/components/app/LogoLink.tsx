import { Link } from "@tanstack/react-router";
import logoSvg from "@/assets/movespot-logo.svg";

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
        src={logoSvg}
        alt="MoveSpot"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain pointer-events-none"
      />
      <span className="font-bold text-base tracking-tight">
        <span className="text-foreground">Move</span>
        <span className="text-primary">Spot</span>
      </span>
    </Link>
  );
}
