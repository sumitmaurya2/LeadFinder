import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/lead-score";

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  return (
    <div
      title={`${band} opportunity`}
      className={cn("flex flex-col items-center leading-tight", className)}
    >
      <span
        className={cn(
          "text-lg font-bold tabular-nums",
          band === "High" && "text-primary",
          band === "Medium" && "text-warning",
          band === "Low" && "text-destructive",
        )}
      >
        {score}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          band === "High" && "text-primary",
          band === "Medium" && "text-warning",
          band === "Low" && "text-destructive",
        )}
      >
        {band}
      </span>
    </div>
  );
}
