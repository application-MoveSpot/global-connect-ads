import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout passthrough — child routes (import, qr, …) render via <Outlet />
export const Route = createFileRoute("/owner/flotte")({ component: () => <Outlet /> });
