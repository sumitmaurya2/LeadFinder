import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe2, Loader2, Mail, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Lead } from "@/lib/api-client";
import {
  analyzeLead,
  checkSocialProfiles,
  checkWebsiteQuality,
  draftOutreach,
} from "@/lib/api-client";

type QualityReport = {
  reachable: boolean;
  https: boolean;
  score: number;
  issues: string[];
};

type SocialProfiles = {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  youtube: string | null;
};

export function LeadInsightsDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const invalidateLeadLists = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const analyze = useMutation({
    mutationFn: (id: string) => analyzeLead(id),
    onSuccess: invalidateLeadLists,
    onError: (error: Error) => toast.error(error.message),
  });

  const outreach = useMutation({
    mutationFn: (id: string) => draftOutreach(id),
    onSuccess: invalidateLeadLists,
    onError: (error: Error) => toast.error(error.message),
  });

  const website = useMutation({
    mutationFn: (id: string) => checkWebsiteQuality(id),
    onError: (error: Error) => toast.error(error.message),
  });

  const social = useMutation({
    mutationFn: (id: string) => checkSocialProfiles(id),
    onError: (error: Error) => toast.error(error.message),
  });

  if (!lead) return null;

  const analysis = analyze.data?.analysis ?? lead.ai_analysis;
  const draft = outreach.data?.outreach ?? lead.outreach;
  const qualityReport = (website.data?.report ?? lead.website_quality) as QualityReport | null;
  const socialProfiles = (social.data?.profiles ?? lead.social_profiles) as SocialProfiles | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
          <DialogDescription>
            Phase 2 tools — each analysis or draft uses 1 credit; quality/social checks are free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI opportunity analysis
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={analyze.isPending}
                onClick={() => analyze.mutate(lead.id)}
              >
                {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Analyze"}
              </Button>
            </div>
            {analysis ? (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>{analysis.opportunitySummary}</p>
                {analysis.painPoints?.length ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pain points</p>
                    <ul className="list-inside list-disc text-xs">
                      {analysis.painPoints.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {analysis.talkingPoints?.length ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Talking points</p>
                    <ul className="list-inside list-disc text-xs">
                      {analysis.talkingPoints.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">{analysis.recommendedApproach}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No analysis yet — requires ANTHROPIC_API_KEY on the backend.
              </p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Outreach draft
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={outreach.isPending}
                onClick={() => outreach.mutate(lead.id)}
              >
                {outreach.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Draft"}
              </Button>
            </div>
            {draft ? (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{draft.email.subject}</p>
                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  {draft.email.body}
                </p>
                <p className="text-xs italic text-muted-foreground">SMS: {draft.sms}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No draft yet.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Globe2 className="h-4 w-4 text-primary" /> Website quality
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={website.isPending || !lead.website}
                onClick={() => website.mutate(lead.id)}
              >
                {website.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Check"}
              </Button>
            </div>
            {!lead.website ? (
              <p className="mt-2 text-xs text-muted-foreground">
                This lead has no website to check.
              </p>
            ) : qualityReport ? (
              <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  Score: <span className="font-semibold">{qualityReport.score}/100</span> ·{" "}
                  {qualityReport.reachable ? "Reachable" : "Unreachable"} ·{" "}
                  {qualityReport.https ? "HTTPS" : "No HTTPS"}
                </p>
                {qualityReport.issues.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {qualityReport.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Not checked yet.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Share2 className="h-4 w-4 text-primary" /> Social presence
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={social.isPending || !lead.website}
                onClick={() => social.mutate(lead.id)}
              >
                {social.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scan"}
              </Button>
            </div>
            {!lead.website ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No website to scan for social links.
              </p>
            ) : socialProfiles ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {(["facebook", "instagram", "twitter", "linkedin", "youtube"] as const).map(
                  (key) =>
                    socialProfiles[key] ? (
                      <a
                        key={key}
                        href={socialProfiles[key]!}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full bg-primary-soft px-2.5 py-1 capitalize text-primary-deep hover:underline"
                      >
                        {key}
                      </a>
                    ) : null,
                )}
                {Object.values(socialProfiles).every((v) => !v) ? (
                  <span className="text-muted-foreground">No social links found on the site.</span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Not scanned yet.</p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
