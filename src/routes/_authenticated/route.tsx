import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getProfile } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      const user = await getProfile();
      return { user };
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
