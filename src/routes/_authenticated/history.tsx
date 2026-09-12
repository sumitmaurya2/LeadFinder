import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LeadTable, type LeadRow } from "@/components/lead-table";
import { Button } from "@/components/ui/button";
import { deleteSearch, getSearchHistory, getSearchLeads, setLeadSaved } from "@/lib/api-client";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
});

function History() {
  useDocumentTitle("Search History — LeadFinder");
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: searches } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => getSearchHistory(),
  });

  const { data: leads } = useQuery({
    queryKey: ["search-leads", openId],
    queryFn: () => getSearchLeads({ data: { id: openId! } }),
    enabled: Boolean(openId),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSearch({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpenId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: (input: { ids: string[]; saved: boolean }) => setLeadSaved({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-leads", openId] });
      queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
    },
  });

  const exportCsv = useMutation({
    mutationFn: async (search: { id: string; keyword: string; location: string }) => {
      // Reuse the cache if this search's leads are already loaded (e.g. panel
      // is open); otherwise fetch them on demand just for the export.
      const rows = await queryClient.fetchQuery({
        queryKey: ["search-leads", search.id],
        queryFn: () => getSearchLeads({ data: { id: search.id } }),
      });
      return { search, rows };
    },
    onSuccess: ({ search, rows }) => {
      if (rows.length === 0) {
        toast.error("This search has no leads to export");
        return;
      }
      downloadCsv(
        `leadfinder-${search.keyword}-${search.location}-${search.id.slice(-6)}.csv`.replace(
          /\s+/g,
          "-",
        ),
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
            "Maps URL": l.maps_url,
          })),
        ),
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Search History" subtitle="Re-open any previous search and its results">
      <div className="space-y-3">
        {(searches ?? []).map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold capitalize">
                  {s.keyword} <span className="text-muted-foreground">in</span> {s.location}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()} · {s.leads_found} leads ·{" "}
                  {s.high_opportunity} high opportunity · {s.credits_used} credit
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(new Set());
                    setOpenId(openId === s.id ? null : s.id);
                  }}
                >
                  {openId === s.id ? "Hide results" : "View results"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportCsv.isPending}
                  onClick={() => exportCsv.mutate(s)}
                >
                  {exportCsv.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Export CSV
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete search"
                  onClick={() => remove.mutate(s.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {openId === s.id ? (
              <div className="mt-4">
                <LeadTable
                  leads={(leads ?? []) as LeadRow[]}
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
                    setSelected(
                      checked ? new Set(((leads ?? []) as LeadRow[]).map((l) => l.id)) : new Set(),
                    )
                  }
                  onSave={(lead) => save.mutate({ ids: [lead.id], saved: !lead.saved })}
                />
              </div>
            ) : null}
          </div>
        ))}

        {(searches?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No searches yet.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
