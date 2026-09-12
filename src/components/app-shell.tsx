import { Link, useMatches, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Bookmark,
  CreditCard,
  Crown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { getProfile, signOut } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/find-leads", label: "Find Leads", icon: Search },
  { to: "/my-leads", label: "My Leads", icon: Bookmark },
  { to: "/history", label: "Search History", icon: History },
  { to: "/team", label: "Team", icon: Users },
  { to: "/credits", label: "Credits & Billing", icon: CreditCard },
] as const;

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: profile } = useProfile();
  const remaining = profile?.credits_remaining ?? 0;
  const allowance = Math.max(profile?.credits_allowance ?? 10, remaining);
  const isFree = (profile?.plan ?? "free") === "free";

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <Link to="/dashboard" className="px-2 pt-2" onClick={onNavigate}>
        <Logo />
      </Link>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeProps={{ className: "bg-primary-soft text-primary-deep font-semibold" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-xl border border-sidebar-border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Your Plan</p>
          <p className="font-bold capitalize">{profile?.plan ?? "Free"} Plan</p>
          <div className="mt-3 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {remaining.toLocaleString()} / {allowance.toLocaleString()} credits left
            </span>
          </div>
          <Progress value={(remaining / Math.max(allowance, 1)) * 100} className="mt-2 h-1.5" />
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link to="/credits" onClick={onNavigate}>
              Upgrade Plan
            </Link>
          </Button>
        </div>

        {isFree ? (
          <div className="rounded-xl border border-primary/20 bg-primary-soft p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary-deep" />
              <p className="text-sm font-bold text-primary-deep">Unlock More with Pro Plan</p>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-primary-deep/90">
              {[
                "10x more credits",
                "Export unlimited leads",
                "AI lead analysis",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-primary-deep" /> {item}
                </li>
              ))}
            </ul>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/credits" onClick={onNavigate}>
                View Pricing
              </Link>
            </Button>
          </div>
        ) : null}

        <Button
          variant="ghost"
          className="justify-start gap-3 text-muted-foreground"
          onClick={async () => {
            await signOut();
            window.location.href = "/";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const matches = useMatches();
  const labelByPath: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/find-leads": "Find Leads",
    "/my-leads": "My Leads",
    "/history": "Search History",
    "/team": "Team",
    "/credits": "Credits & Billing",
  };
  const current = [...matches].reverse().find((m) => labelByPath[m.pathname]);
  const label = current ? labelByPath[current.pathname] : undefined;

  return (
    <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
      <Link to="/dashboard" className="hover:text-foreground">
        Dashboard
      </Link>
      {label && label !== "Dashboard" ? (
        <>
          <span>/</span>
          <span className="font-medium text-foreground">{label}</span>
        </>
      ) : null}
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: profile } = useProfile();
  const remaining = profile?.credits_remaining ?? 0;
  const allowance = Math.max(profile?.credits_allowance ?? 10, remaining);

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <div className={cn("lg:pl-64")}>
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <Breadcrumb />
            <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>

          {actions}

          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:flex">
            <div className="text-xs">
              <p className="text-muted-foreground">Credits Left</p>
              <p className="font-bold tabular-nums">
                {remaining.toLocaleString()} / {allowance.toLocaleString()}
              </p>
            </div>
            <Progress value={(remaining / Math.max(allowance, 1)) * 100} className="h-1.5 w-16" />
          </div>

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/credits">Upgrade Plan</Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full pl-1 pr-2 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {initials(profile?.full_name || profile?.email || "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left text-xs leading-tight md:block">
                  <span className="block font-semibold">{profile?.full_name || "Account"}</span>
                  <span className="block text-muted-foreground capitalize">
                    {profile?.plan ?? "free"} Plan
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/credits">Credits &amp; billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
