import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/annonceur/preview-3d")({
  beforeLoad: () => { throw redirect({ to: "/annonceur" }); },
  component: () => null,
});
