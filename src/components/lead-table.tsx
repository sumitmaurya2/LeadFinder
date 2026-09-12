import { Globe, MoreVertical, Phone, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { LeadInsightsDialog } from "@/components/lead-insights-dialog";
import { ScoreBadge } from "@/components/score-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/api-client";

// LeadRow is the full API Lead shape — the table (and its insights dialog)
// need every Phase 2 field (ai_analysis, outreach, etc.), not just the basics.
export type LeadRow = Lead;

const AVATAR_COLORS = [
  "bg-[#7c4a2d] text-white",
  "bg-[#1f4d3d] text-white",
  "bg-[#c99a3d] text-white",
  "bg-[#d8c3a5] text-[#4a3b28]",
  "bg-[#1a1a1a] text-white",
  "bg-primary text-primary-foreground",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function websiteLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LeadTable({
  leads,
  selected,
  onToggle,
  onToggleAll,
  onSave,
}: {
  leads: LeadRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onSave: (lead: LeadRow) => void;
}) {
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const [insightsLead, setInsightsLead] = useState<LeadRow | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onToggleAll(Boolean(v))}
                aria-label="Select all leads"
              />
            </TableHead>
            <TableHead>Business Name</TableHead>
            <TableHead className="hidden md:table-cell">Rating</TableHead>
            <TableHead className="hidden md:table-cell">Reviews</TableHead>
            <TableHead className="hidden lg:table-cell">Phone</TableHead>
            <TableHead className="hidden lg:table-cell">Website</TableHead>
            <TableHead className="text-center">Lead Score</TableHead>
            <TableHead className="w-40">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="align-middle">
              <TableCell>
                <Checkbox
                  checked={selected.has(lead.id)}
                  onCheckedChange={() => onToggle(lead.id)}
                  aria-label={`Select ${lead.name}`}
                />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      avatarColor(lead.name),
                    )}
                  >
                    {initials(lead.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{lead.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{lead.address}</div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {lead.rating ? (
                  <span className="inline-flex items-center gap-1 font-medium">
                    {lead.rating.toFixed(1)}
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="hidden md:table-cell text-muted-foreground">
                {lead.reviews.toLocaleString()}
              </TableCell>

              <TableCell className="hidden lg:table-cell text-sm">
                {lead.phone ? (
                  <a className="hover:underline" href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="hidden lg:table-cell text-sm">
                {lead.website ? (
                  <a
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {websiteLabel(lead.website)}
                  </a>
                ) : (
                  <span className="font-medium text-destructive">No Website</span>
                )}
              </TableCell>

              <TableCell className="text-center">
                <ScoreBadge score={lead.lead_score} className="mx-auto" />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setInsightsLead(lead)}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    View Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`More actions for ${lead.name}`}
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSave(lead)}>
                        {lead.saved ? "Remove from My Leads" : "Save to My Leads"}
                      </DropdownMenuItem>
                      {lead.phone ? (
                        <DropdownMenuItem asChild>
                          <a href={`tel:${lead.phone}`}>Call {lead.phone}</a>
                        </DropdownMenuItem>
                      ) : null}
                      {lead.maps_url ? (
                        <DropdownMenuItem asChild>
                          <a href={lead.maps_url} target="_blank" rel="noreferrer noopener">
                            Open in Google Maps
                          </a>
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <LeadInsightsDialog
        lead={insightsLead}
        open={insightsLead !== null}
        onOpenChange={(open) => !open && setInsightsLead(null)}
      />
    </div>
  );
}
