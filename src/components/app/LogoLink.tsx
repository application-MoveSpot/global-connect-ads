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
        <path
          d="M32 2C15 2 2 14 2 26C2 36 7 43 17 49Q24 52 32 55Q40 52 47 49C57 43 62 36 62 26C62 14 49 2 32 2Z"
          fill="#F05A28"
        />
        <circle cx="32" cy="22" r="12" fill="#EFF2F8" />
        <circle cx="32" cy="22" r="5" fill="#F05A28" />
        <circle cx="17" cy="45" r="8" fill="#0A1628" />
        <circle cx="17" cy="45" r="5" fill="#CBD5E1" />
        <circle cx="47" cy="45" r="8" fill="#0A1628" />
        <circle cx="47" cy="45" r="5" fill="#CBD5E1" />
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
