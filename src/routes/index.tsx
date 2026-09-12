import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, SlidersHorizontal, Flame, Download, Check, ArrowRight, Star } from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { creditPacks, formatInr } from "@/lib/credit-packs";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: MapPin,
    title: "Business Search",
    body: "Pick a business type and a location and pull a clean list of matching local businesses.",
  },
  {
    icon: SlidersHorizontal,
    title: "Smart Filters",
    body: "Narrow by rating, review count, website presence, phone number and operating status.",
  },
  {
    icon: Flame,
    title: "Lead Scoring",
    body: "Every business gets a 0-99 opportunity score so you call the best prospects first.",
  },
  {
    icon: Download,
    title: "Export Leads",
    body: "Save the ones that matter and export the whole list to CSV in one click.",
  },
];

function Landing() {
  useDocumentTitle("LeadFinder — Find High-Quality Local Business Leads");
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-deep">
              <Star className="h-3.5 w-3.5" /> 10 free searches every month
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Find High-Quality <span className="text-primary">Local Business</span> Leads
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Choose the business type and city you want, and LeadFinder returns scored,
              contact-ready leads — with the ones missing a website flagged as your biggest
              opportunity.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Start Finding Leads Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card needed", "CSV export", "Lead scoring built in"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lift)]">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h2 className="text-lg font-bold">Your lead dashboard</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Total Leads", value: "1,284" },
                { label: "Qualified", value: "612" },
                { label: "High Opportunity", value: "238" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-muted/60 p-3">
                  <div className="text-2xl font-extrabold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {[
                { name: "Brew & Bloom Cafe", score: 92 },
                { name: "Sunrise Bakery & Coffee", score: 87 },
                { name: "Urban Grind Coffee House", score: 74 },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {row.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Everything you need to work local leads
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Search, filter, score, save and export — all in one workspace.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-deep">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">
            Simple credit packs
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Ten free searches every month. Need more? Top up any time.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`rounded-2xl border bg-card p-6 ${pack.popular ? "border-primary shadow-[var(--shadow-lift)]" : "border-border shadow-[var(--shadow-card)]"}`}
              >
                {pack.popular ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <h3 className="mt-3 text-lg font-bold">{pack.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{pack.tagline}</p>
                <div className="mt-4 text-3xl font-extrabold">{formatInr(pack.amountPaise)}</div>
                <div className="text-sm text-muted-foreground">
                  {pack.credits.toLocaleString()} searches
                </div>
                <Button
                  asChild
                  className="mt-5 w-full"
                  variant={pack.popular ? "default" : "outline"}
                >
                  <Link to="/auth">Get started</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground">
          <Logo />
          <span>© {new Date().getFullYear()} LeadFinder. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
