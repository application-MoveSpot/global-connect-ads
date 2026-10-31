import { Link } from "@tanstack/react-router";
import logoSvg from "@/assets/movespot-logo.svg";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      className="inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-lg"
    >
      <img
        src={logoSvg}
        alt="MoveSpot"
        width={40}
        height={40}
        className="h-10 w-10 object-contain"
      />
      <span className="font-bold text-base tracking-tight">MoveSpot</span>
    </Link>
  );
}
