import { Link } from "@tanstack/react-router";
import logo from "@/assets/movespot-logo.png";

export function LogoLink() {
  return (
    <Link to="/" aria-label="MoveSpot — accueil">
      <img src={logo} alt="MoveSpot" height={48} className="h-12 w-auto" />
    </Link>
  );
}
