import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sessions-live")({
  beforeLoad: () => {
    throw redirect({ to: "/sessions" });
  },
});
