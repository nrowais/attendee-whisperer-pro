import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tickets")({
  beforeLoad: () => {
    throw redirect({ to: "/fleet" });
  },
  component: () => null,
});
