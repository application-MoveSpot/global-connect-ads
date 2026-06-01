import { Link } from "@tanstack/react-router";
import logo from "@/assets/movespot-logo.png";

export function LogoLink() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo} alt="MoveSpot" width={32} height={32} className="h-8 w-8" />
      <span className="font-display font-bold text-lg tracking-tight">MoveSpot</span>
    </Link>
  );
}
