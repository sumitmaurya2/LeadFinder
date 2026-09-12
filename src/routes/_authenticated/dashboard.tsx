import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Flame, Search, Users } from "lucide-react";

import { AppShell, useProfile } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/api-client";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-lg bg-primary-soft p-2 text-primary-deep">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function Dashboard() {
  useDocumentTitle("Dashboard — LeadFinder");
  const { data: profile } = useProfile();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

  return (
    <AppShell
      title={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
      subtitle="Here's how your lead generation is going"
      actions={
        <Button asChild>
          <Link to="/find-leads">New search</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Leads" value={data?.totalLeads ?? 0} icon={Users} />
        <Stat label="Saved Leads" value={data?.savedLeads ?? 0} icon={Bookmark} />
        <Stat label="High Opportunity" value={data?.highOpportunity ?? 0} icon={Flame} />
        <Stat label="Searches Run" value={data?.searchesRun ?? 0} icon={Search} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent searches</h2>
          <Link to="/history" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 divide-y divide-border">
          {(data?.recentSearches ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium capitalize">{s.keyword}</div>
                <div className="text-xs text-muted-foreground">{s.location}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {s.leads_found} leads · {s.high_opportunity} high
              </div>
            </div>
          ))}
          {(data?.recentSearches?.length ?? 0) === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No searches yet — run your first search to see results here.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
