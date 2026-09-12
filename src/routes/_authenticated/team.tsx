import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, LogOut, Plus, UserPlus, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { createTeam, getTeams, inviteToTeam, leaveTeam } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});

function TeamPage() {
  useDocumentTitle("Team — LeadFinder");
  const queryClient = useQueryClient();
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({ queryKey: ["teams"], queryFn: () => getTeams() });

  const create = useMutation({
    mutationFn: (name: string) => createTeam(name),
    onSuccess: () => {
      toast.success("Team created");
      setNewTeamName("");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invite = useMutation({
    mutationFn: (teamId: string) => inviteToTeam(teamId, inviteEmail || undefined),
    onSuccess: (result) => {
      setLastInviteUrl(result.inviteUrl);
      toast.success("Invite link created");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leave = useMutation({
    mutationFn: (teamId: string) => leaveTeam(teamId),
    onSuccess: () => {
      toast.success("Left team");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const team = teams?.[0] ?? null;

  return (
    <AppShell
      title="Team"
      subtitle="Share a credit pool and leads across your team"
      actions={undefined}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !team ? (
        <div className="max-w-md rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Create a team</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Teams share one credit pool (50 credits/month to start) and let members see each other's
            searches and leads.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="e.g. Acme Sales"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
            <Button
              disabled={!newTeamName.trim() || create.isPending}
              onClick={() => create.mutate(newTeamName.trim())}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{team.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => leave.mutate(team.id)}
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Leave
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Shared credits</span>
                <span className="tabular-nums text-muted-foreground">
                  {team.credits_remaining.toLocaleString()} /{" "}
                  {team.credits_allowance.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(team.credits_remaining / Math.max(team.credits_allowance, 1)) * 100}
                className="mt-2 h-2"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium">Members ({team.members.length})</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {team.members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between">
                    <span className="truncate">{m.user_id}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Invite a teammate</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Generates a one-time link, valid for 7 days. No email server configured — copy and
              send it yourself.
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                type="email"
                placeholder="teammate@company.com (optional)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button disabled={invite.isPending} onClick={() => invite.mutate(team.id)}>
                Invite
              </Button>
            </div>

            {lastInviteUrl ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs">
                <span className="min-w-0 flex-1 truncate">{lastInviteUrl}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(lastInviteUrl);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}

            {team.pending_invites.length > 0 ? (
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Pending invites</Label>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {team.pending_invites.map((i) => (
                    <li key={i.token}>
                      {i.email ?? "Anyone with the link"} · expires{" "}
                      {new Date(i.expires_at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}
