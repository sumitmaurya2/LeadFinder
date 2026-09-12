import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MapPin
        className={cn("h-6 w-6", invert ? "text-primary-foreground" : "text-primary")}
        strokeWidth={2.5}
      />
      <span
        className={cn("text-xl font-extrabold tracking-tight", invert && "text-primary-foreground")}
      >
        Lead<span className="text-primary">Finder</span>
      </span>
    </span>
  );
}
