import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/advertiser/exemples")({
  beforeLoad: () => {
    throw redirect({ to: "/comment-ca-marche", replace: true });
  },
  component: () => null,
});
