import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { joinTeam } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/team/join/$token")({
  component: JoinTeamPage,
});

function JoinTeamPage() {
  useDocumentTitle("Join team — LeadFinder");
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"joining" | "done" | "error">("joining");
  const [message, setMessage] = useState("");

  useEffect(() => {
    joinTeam(token)
      .then((team) => {
        setStatus("done");
        setTimeout(() => navigate({ to: "/team" }), 1200);
        setMessage(`You're in — welcome to ${team.name}.`);
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message || "This invite link is invalid or expired.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AppShell title="Join team">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-sm shadow-[var(--shadow-card)]">
        {status === "joining" ? "Joining team…" : message}
      </div>
    </AppShell>
  );
}
