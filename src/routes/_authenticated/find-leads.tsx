import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LeadTable, type LeadRow } from "@/components/lead-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv, toCsv } from "@/lib/csv";
import { searchLeads, setLeadSaved } from "@/lib/api-client";
import { defaultFilters, type LeadFilters } from "@/lib/leads.schemas";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_authenticated/find-leads")({
  component: FindLeads,
});

const businessTypes = [
  "Cafe",
  "Restaurant",
  "Gym",
  "Salon",
  "Dentist",
  "Real Estate Agent",
  "Plumber",
  "Boutique",
  "Coaching Center",
  "Hotel",
];

type SortKey = "score" | "rating" | "reviews" | "name";
const PAGE_SIZE = 20;

function FindLeads() {
  useDocumentTitle("Find Leads — LeadFinder");
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("India");
  const [limit, setLimit] = useState(100);
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [searchSource, setSearchSource] = useState<"api" | "google" | "demo" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("score");
  const [page, setPage] = useState(1);
  const [lastSearch, setLastSearch] = useState<{
    keyword: string;
    location: string;
    country: string;
  } | null>(null);
  const [lastSearchTime, setLastSearchTime] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: () => searchLeads({ data: { keyword, location, country, limit, filters } }),
    onSuccess: (result) => {
      setLeads(result.leads as LeadRow[]);
      setSearchSource(result.source);
      setSelected(new Set());
      setPage(1);
      setLastSearch({ keyword, location, country });
      setLastSearchTime(new Date().toLocaleTimeString());
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (result.source === "demo") {
        toast.warning("Demo results are shown. Configure a lead source for real businesses.");
      } else {
        toast.success(`${result.leads.length} leads found`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: (input: { ids: string[]; saved: boolean }) => setLeadSaved({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-leads"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleSave(lead: LeadRow) {
    const next = !lead.saved;
    setLeads((rows) => rows.map((r) => (r.id === lead.id ? { ...r, saved: next } : r)));
    save.mutate({ ids: [lead.id], saved: next });
  }

  function saveSearch() {
    if (leads.length === 0) {
      toast.error("Run a search first");
      return;
    }
    save.mutate({ ids: leads.map((l) => l.id), saved: true });
    toast.success(`Saved ${leads.length} leads to My Leads`);
  }

  function exportCsv() {
    const rows = leads.filter((l) => selected.size === 0 || selected.has(l.id));
    if (rows.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    downloadCsv(
      `leadfinder-${Date.now()}.csv`,
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
  }

  const sortedLeads = useMemo(() => {
    const rows = [...leads];
    rows.sort((a, b) => {
      switch (sort) {
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "reviews":
          return b.reviews - a.reviews;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.lead_score - a.lead_score;
      }
    });
    return rows;
  }, [leads, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  const pageLeads = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedLeads.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedLeads.length);

  const highOpportunity = leads.filter((l) => l.lead_score >= 80).length;

  return (
    <AppShell title="Find Leads" subtitle="Search local businesses and score them instantly">
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold">Find Local Business Leads</h2>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                search.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_0.75fr]">
                <div className="space-y-2">
                  <Label htmlFor="keyword">Business Type / Keyword</Label>
                  <Input
                    id="keyword"
                    list="business-types"
                    placeholder="e.g. Cafes"
                    required
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <datalist id="business-types">
                    {businessTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Lucknow, Uttar Pradesh"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g. India"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Number of Leads</Label>
                  <Input
                    id="limit"
                    type="number"
                    min={10}
                    max={100}
                    step={10}
                    value={limit}
                    onChange={(e) =>
                      setLimit(Math.min(100, Math.max(10, Number(e.target.value) || 10)))
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button type="submit" disabled={search.isPending}>
                  {search.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search Leads
                </Button>
                <p className="text-xs text-muted-foreground">
                  1 credit per search · scored instantly
                </p>
              </div>
            </form>
          </div>

          {leads.length > 0 ? (
            <>
              {searchSource === "demo" ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  You are viewing demo data, not live businesses. Add <code>LEADS_API_URL</code> and
                  <code className="ml-1">LEADS_API_KEY</code> to the backend environment, then restart
                  the backend to search real businesses.
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Found {leads.length} Leads</h3>
                  <p className="text-sm text-muted-foreground">
                    Showing {rangeStart} to {rangeEnd} of {sortedLeads.length} results
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={saveSearch}>
                    <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                    Save Search
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCsv}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Sort by: Best Score</SelectItem>
                      <SelectItem value="rating">Sort by: Rating</SelectItem>
                      <SelectItem value="reviews">Sort by: Reviews</SelectItem>
                      <SelectItem value="name">Sort by: Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LeadTable
                leads={pageLeads}
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
                  setSelected(checked ? new Set(pageLeads.map((l) => l.id)) : new Set())
                }
                onSave={toggleSave}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((n) => (
                      <Button
                        key={n}
                        variant={n === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">{PAGE_SIZE} per page</span>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Enter a business type, location, and country to start finding leads.
            </div>
          )}
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setFilters(defaultFilters)}
              >
                Clear All
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Select
                  value={String(filters.minRating ?? "any")}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, minRating: v === "any" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any rating</SelectItem>
                    <SelectItem value="3">3.0+</SelectItem>
                    <SelectItem value="3.5">3.5+</SelectItem>
                    <SelectItem value="4">4.0+</SelectItem>
                    <SelectItem value="4.5">4.5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Reviews</Label>
                <Select
                  value={String(filters.minReviews ?? "any")}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, minReviews: v === "any" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="10">10+</SelectItem>
                    <SelectItem value="50">50+</SelectItem>
                    <SelectItem value="100">100+</SelectItem>
                    <SelectItem value="500">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Select
                  value={filters.website}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, website: v as LeadFilters["website"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="none">No website (best leads)</SelectItem>
                    <SelectItem value="has">Has website</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Select
                  value={filters.phone}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, phone: v as LeadFilters["phone"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="has">Has phone</SelectItem>
                    <SelectItem value="none">No phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, status: v as LeadFilters["status"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lead Score</Label>
                <Select
                  value={String(filters.minScore ?? "any")}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, minScore: v === "any" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="80">High (80+)</SelectItem>
                    <SelectItem value="55">Medium (55+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                variant="outline"
                type="button"
                onClick={() => search.mutate()}
              >
                Apply Filters
              </Button>
            </div>
          </div>

          {lastSearch ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-semibold">Search Summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Keyword", lastSearch.keyword],
                  ["Location", lastSearch.location],
                  ["Country", lastSearch.country],
                  ["Leads Found", String(leads.length)],
                  ["High Opportunity", String(highOpportunity)],
                  ["Search Time", lastSearchTime ?? "—"],
                  ["Date", new Date().toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="rounded-xl border border-primary/20 bg-primary-soft p-5">
            <p className="text-sm font-bold text-primary-deep">Need help?</p>
            <p className="mt-1 text-xs text-primary-deep/80">
              Learn how to find the best leads for your business.
            </p>
            <a
              href="#"
              className="mt-2 inline-block text-xs font-semibold text-primary-deep hover:underline"
            >
              View Guide →
            </a>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
