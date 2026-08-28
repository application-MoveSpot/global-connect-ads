import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          version: process.env["VITE_APP_VERSION"] ?? "unknown",
          env: process.env["NODE_ENV"] ?? "unknown",
        });
      },
    },
  },
});
