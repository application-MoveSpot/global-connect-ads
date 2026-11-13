import { Link } from "@tanstack/react-router";
import logo from "@/assets/movespot-logo.png.asset.json";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      className="inline-flex shrink-0 items-center px-1 py-1.5 rounded-lg select-none"
    >
      <img
        src={logo.url}
        alt="MoveSpot"
        width={273}
        height={359}
        className="h-12 sm:h-16 w-auto shrink-0 object-contain pointer-events-none"
      />
    </Link>
  );
}
