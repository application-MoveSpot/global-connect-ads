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
          d="M32 3C43 3 52 12 52 23C52 32 46 39 38 43Q35 46 32 49Q29 46 26 43C18 39 12 32 12 23C12 12 21 3 32 3Z"
          fill="#F05A28"
        />
        <circle cx="32" cy="22" r="11" fill="#EFF2F8" />
        <circle cx="32" cy="22" r="4.5" fill="#F05A28" />
        <circle cx="21" cy="38" r="6" fill="#0A1628" />
        <circle cx="21" cy="38" r="3.5" fill="#CBD5E1" />
        <circle cx="43" cy="38" r="6" fill="#0A1628" />
        <circle cx="43" cy="38" r="3.5" fill="#CBD5E1" />
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
