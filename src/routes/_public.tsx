import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/shared/Navbar";
import { PublicFooter } from "@/components/shared/PublicFooter";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <PublicFooter />
    </>
  );
}
