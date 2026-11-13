import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearConsent } from "@/lib/consent";

function ManageCookiesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => clearConsent()}
      className="hover:text-foreground transition text-left"
    >
      {label}
    </button>
  );
}

export function PublicFooter() {
  const { t } = useTranslation();
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [isLovablePreview, setIsLovablePreview] = useState(false);
  useEffect(() => {
    setIsLovablePreview(window.location.hostname.includes("lovable.app"));
  }, []);

  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-4 space-y-6">
        {/* Paiement sécurisé */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>{tx("footer.payment_secure", "Paiement sécurisé :")}</span>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#003189] dark:text-[#6699ff] shadow-sm">
            CB
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#1A1F71] dark:text-[#6699ff] shadow-sm">
            Visa
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#EB001B] shadow-sm">
            Mastercard
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#6772E5] shadow-sm">
            Stripe
          </span>
          <span>{tx("footer.transactions_3ds", "· Transactions 3D Secure")}</span>
        </div>

        {/* Réseaux sociaux */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="text-xs">{tx("footer.follow_us", "Suivez-nous :")}</span>
          <a
            href="https://www.instagram.com/movespot_pub/"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            aria-label="Instagram"
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <Instagram className="h-5 w-5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="space-y-0.5">
            <div>
              © {new Date().getFullYear()} MoveSpot — RAKOUN KLUB · SIRET : 804 671 444 00052
            </div>
            <div>1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, France</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/annonceurs-entreprise" className="hover:text-foreground transition">
              {tx("footer.b2b", "Solution B2B")}
            </Link>
            <Link to="/cgu" className="hover:text-foreground transition">
              {tx("footer.cgu", "CGU")}
            </Link>
            <Link to="/cgv" className="hover:text-foreground transition">
              {tx("footer.cgv", "CGV")}
            </Link>
            <Link to="/confidentialite" className="hover:text-foreground transition">
              {tx("footer.confidentialite", "Confidentialité")}
            </Link>
            <Link to="/cookies" className="hover:text-foreground transition">
              {tx("footer.cookies", "Cookies")}
            </Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition">
              {tx("footer.mentions", "Mentions légales")}
            </Link>
            <ManageCookiesButton label={tx("footer.manage_cookies", "Gérer mes cookies")} />
            {isLovablePreview && (
              <Link to="/admin" className="hover:text-foreground transition text-amber-500">
                ⚙ Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
