import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/advertiser/preview-3d")({
  beforeLoad: () => {
    throw redirect({ to: "/advertiser/briefs/nouveau", replace: true });
  },
  component: () => null,
});
