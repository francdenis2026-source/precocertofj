import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/economia")({
  beforeLoad: () => {
    throw redirect({ to: "/app/insights", replace: true });
  },
});
