import { Link } from "@tanstack/react-router";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      className="flex flex-col items-center gap-0.5 no-underline"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="w-10 h-10"
        aria-hidden="true"
      >
        <path
          d="M32 59C21 46 7 36 7 22C7 13 18.6 5 32 5C45.4 5 57 13 57 22C57 36 43 46 32 59Z"
          fill="#F05A28"
        />
        <circle cx="32" cy="22" r="11" fill="#EFF2F8" />
        <circle cx="32" cy="22" r="4.5" fill="#F05A28" />
        <circle cx="20" cy="52" r="7" fill="#0A1628" />
        <circle cx="20" cy="52" r="4" fill="#CBD5E1" />
        <circle cx="44" cy="52" r="7" fill="#0A1628" />
        <circle cx="44" cy="52" r="4" fill="#CBD5E1" />
      </svg>
      <span
        className="font-bold text-[15px] leading-none tracking-tight font-sans"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <span className="text-[#0A1628] dark:text-white">Move</span>
        <span className="text-[#F05A28]">Spot</span>
      </span>
    </Link>
  );
}
