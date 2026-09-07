import { Link } from "@tanstack/react-router";
import logo from "@/assets/movespot-logo.svg";

export function LogoLink() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo} alt="MoveSpot" width={32} height={32} className="h-8 w-8" />
      <span className="font-display font-bold text-lg tracking-tight">
        <span className="text-[#0A1628] dark:text-white">Move</span><span className="text-[#F05A28]">Spot</span>
      </span>
    </Link>
  );
}
