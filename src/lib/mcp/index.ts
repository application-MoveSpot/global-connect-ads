import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyVehicles from "./tools/list-my-vehicles";
import listMyCampaigns from "./tools/list-my-campaigns";
import listMyBriefs from "./tools/list-my-briefs";
import getWalletBalance from "./tools/get-wallet-balance";
import searchProviders from "./tools/search-providers";

// L'émetteur OAuth doit être l'hôte Supabase direct : seule la référence projet
// survit à la publication, et Vite l'inline à la compilation.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "movespot",
  title: "MoveSpot",
  version: "0.1.0",
  instructions:
    "Outils MoveSpot, la marketplace de publicité mobile sur véhicules. Utilisez list_my_vehicles pour la flotte du propriétaire connecté, list_my_campaigns et list_my_briefs pour ses campagnes et briefs, get_wallet_balance pour son portefeuille, et search_providers pour l'annuaire des prestataires approuvés (covering, vidéo, graphisme). Toutes les données sont limitées à l'utilisateur connecté.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyVehicles, listMyCampaigns, listMyBriefs, getWalletBalance, searchProviders],
});
