import { Link } from "@tanstack/react-router";

export function LogoLink() {
  return (
    <Link
      to="/"
      aria-label="MoveSpot — accueil"
      style={{ textDecoration: "none", outline: "none", border: "none", background: "none", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "2px" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width="40"
        height="40"
        aria-hidden="true"
      >
        <circle cx="20" cy="52" r="7" fill="#0A1628" />
        <circle cx="20" cy="52" r="4" fill="#CBD5E1" />
        <circle cx="44" cy="52" r="7" fill="#0A1628" />
        <circle cx="44" cy="52" r="4" fill="#CBD5E1" />
        <path
          d="M32 5C45.4 5 57 13 57 22C57 36 43 46 32 59C21 46 7 36 7 22C7 13 18.6 5 32 5Z"
          fill="#F05A28"
        />
        <circle cx="32" cy="22" r="11" fill="#EFF2F8" />
        <circle cx="32" cy="22" r="4.5" fill="#F05A28" />
      </svg>
      <span
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "15px", lineHeight: 1 }}
      >
        <span style={{ color: "#0A1628" }}>Move</span>
        <span style={{ color: "#F05A28" }}>Spot</span>
      </span>
    </Link>
  );
}
