import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import logoOfficial from "@/assets/movespot-logo-horizontal.png.asset.json";

export function Navbar() {
  const { t } = useTranslation();
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const mapHref = isHome ? "#map" : "/#map";
  const spotsHref = isHome ? "#spots" : "/#spots";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-header border-b border-header-border">
      <div className="mx-auto grid max-w-[1700px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 sm:px-6 min-[1700px]:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Link
          to="/"
          aria-label="MoveSpot — accueil"
          /* clear space: px-1 py-1 — no fixed width, no overflow-hidden
             shrink-0 prevents the logo from being compressed by flex siblings
             z-index is inherited from sticky header z-40 */
          className="flex h-16 shrink-0 items-center justify-start gap-2 px-1 py-1 select-none"
        >
          <img
            src={logoOfficial.url}
            alt="MoveSpot"
            width={360}
            height={80}
            className="h-12 w-auto shrink-0 object-contain pointer-events-none"
          />
        </Link>
        <nav className="hidden min-w-0 items-center justify-center gap-5 text-sm text-header-muted min-[1700px]:flex">
          <a href={mapHref} className="whitespace-nowrap hover:text-header-foreground transition">
            {tx("nav.realtime", "Temps réel")}
          </a>
          <a href={spotsHref} className="whitespace-nowrap hover:text-header-foreground transition">
            {tx("nav.vehicles", "Véhicules")}
          </a>
          <Link
            to="/campagnes"
            className="whitespace-nowrap hover:text-header-foreground transition"
          >
            {tx("nav.campaigns", "Campagnes")}
          </Link>
          <Link
            to="/comment-ca-marche"
            className="whitespace-nowrap hover:text-header-foreground transition"
          >
            {tx("nav.how_it_works", "Comment ça marche")}
          </Link>
          <Link
            to="/pourquoi-movespot"
            className="whitespace-nowrap hover:text-header-foreground transition"
          >
            {tx("nav.why_movespot", "Pourquoi MoveSpot")}
          </Link>
          <Link to="/tarifs" className="whitespace-nowrap hover:text-header-foreground transition">
            {tx("nav.pricing", "Tarifs")}
          </Link>
          <Link
            to="/devenir-partenaire"
            className="whitespace-nowrap hover:text-header-foreground transition"
          >
            {tx("nav.become_partner", "Devenir partenaire")}
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher className="hidden lg:flex" />
          <Link
            to="/advertiser"
            className="hidden sm:inline-block rounded-full border border-header-border bg-header-card px-4 py-2 text-sm font-medium text-header-foreground hover:bg-header-muted/15 transition"
          >
            {tx("nav.advertiser", "Espace annonceur")}
          </Link>
          <Link
            to="/owner"
            className="hidden xl:inline-block rounded-full border border-header-border bg-header-card px-4 py-2 text-sm font-medium text-header-foreground hover:bg-header-muted/15 transition"
          >
            {tx("nav.owner", "Espace propriétaire")}
          </Link>
          <Link
            to="/commencer"
            className="hidden sm:inline-block rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition"
          >
            {tx("nav.signup", "S'inscrire")}
          </Link>
          <a
            href={spotsHref}
            className="hidden lg:inline-block rounded-full border border-header-border bg-header-card px-4 py-2 text-sm font-medium text-header-foreground hover:bg-header-muted/15 transition"
          >
            {tx("nav.book", "Réserver")}
          </a>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-header-border bg-header-card text-header-foreground transition hover:bg-header-muted/15 min-[1700px]:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-header-border bg-header min-[1700px]:hidden">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1 text-sm">
            <a
              href={mapHref}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.realtime", "Temps réel")}
            </a>
            <a
              href={spotsHref}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.vehicles", "Véhicules")}
            </a>
            <Link
              to="/campagnes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.campaigns", "Campagnes")}
            </Link>
            <Link
              to="/comment-ca-marche"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.how_it_works", "Comment ça marche")}
            </Link>
            <Link
              to="/pourquoi-movespot"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.why_movespot", "Pourquoi MoveSpot")}
            </Link>
            <Link
              to="/tarifs"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.pricing", "Tarifs")}
            </Link>
            <Link
              to="/devenir-partenaire"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-header-muted hover:text-header-foreground"
            >
              {tx("nav.become_partner", "Devenir partenaire")}
            </Link>
            <div className="h-px bg-header-border my-2" />
            <Link
              to="/advertiser"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 font-medium text-header-foreground"
            >
              {tx("nav.advertiser", "Espace annonceur")}
            </Link>
            <Link
              to="/owner"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 font-medium text-header-foreground"
            >
              {tx("nav.owner", "Espace propriétaire")}
            </Link>
            <LanguageSwitcher className="py-2 lg:hidden [&>button]:text-header-muted [&>button:hover]:text-header-foreground" />
            <Link
              to="/commencer"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-center font-semibold"
            >
              {tx("nav.signup", "S'inscrire")}
            </Link>
            <a
              href={spotsHref}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full border border-header-border bg-header-card px-4 py-2.5 text-center font-medium text-header-foreground"
            >
              {tx("nav.book", "Réserver")}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
