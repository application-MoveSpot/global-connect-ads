import { Link } from "@tanstack/react-router";
import officialLogo from "@/assets/movespot-logo-official.png.asset.json";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      className="inline-flex shrink-0 items-center overflow-hidden rounded-lg"
    >
      <img
        src={officialLogo.url}
        alt="MoveSpot"
        width={512}
        height={512}
        className="h-10 w-auto max-w-full object-contain"
      />
    </Link>
  );
}
