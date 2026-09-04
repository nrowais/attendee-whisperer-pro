import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sessions-map")({
  beforeLoad: () => {
    throw redirect({ to: "/sessions" });
  },
});
