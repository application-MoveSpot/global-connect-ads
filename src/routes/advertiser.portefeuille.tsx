import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/advertiser/portefeuille")({
  beforeLoad: () => {
    throw redirect({ to: "/advertiser", replace: true });
  },
  component: () => null,
});
