import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LeadTable, type LeadRow } from "@/components/lead-table";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { getSavedLeads, setLeadSaved } from "@/lib/api-client";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_authenticated/my-leads")({
  component: MyLeads,
});

function MyLeads() {
  useDocumentTitle("My Leads — LeadFinder");
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data } = useQuery({ queryKey: ["saved-leads"], queryFn: () => getSavedLeads() });
  const leads = (data ?? []) as LeadRow[];

  const unsave = useMutation({
    mutationFn: (ids: string[]) => setLeadSaved({ data: { ids, saved: false } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelected(new Set());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function exportCsv() {
    const rows = leads.filter((l) => selected.size === 0 || selected.has(l.id));
    if (rows.length === 0) {
      toast.error("No saved leads to export");
      return;
    }
    downloadCsv(
      `leadfinder-saved-${Date.now()}.csv`,
      toCsv(
        rows.map((l) => ({
          Name: l.name,
          Category: l.category,
          Address: l.address,
          Phone: l.phone,
          Website: l.website,
          Rating: l.rating,
          Reviews: l.reviews,
          "Lead Score": l.lead_score,
        })),
      ),
    );
  }

  return (
    <AppShell
      title="My Leads"
      subtitle={`${leads.length} saved lead${leads.length === 1 ? "" : "s"}`}
      actions={
        <div className="flex gap-2">
          {selected.size > 0 ? (
            <Button variant="outline" onClick={() => unsave.mutate([...selected])}>
              Remove {selected.size}
            </Button>
          ) : null}
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      }
    >
      {leads.length > 0 ? (
        <LeadTable
          leads={leads}
          selected={selected}
          onToggle={(id) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onToggleAll={(checked) =>
            setSelected(checked ? new Set(leads.map((l) => l.id)) : new Set())
          }
          onSave={(lead) => unsave.mutate([lead.id])}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          You haven't saved any leads yet.
        </div>
      )}
    </AppShell>
  );
}
