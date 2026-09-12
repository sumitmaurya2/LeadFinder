import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell, useProfile } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { creditPacks, formatInr } from "@/lib/credit-packs";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  getCreditHistory,
  createCreditOrder,
  getPayments,
  paymentsConfigured,
  verifyCreditPayment,
} from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/credits")({
  component: Credits,
});

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Credits() {
  useDocumentTitle("Credits & Billing — LeadFinder");
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: config } = useQuery({
    queryKey: ["payments-configured"],
    queryFn: () => paymentsConfigured(),
  });
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: () => getPayments() });
  const { data: history } = useQuery({
    queryKey: ["credit-history"],
    queryFn: () => getCreditHistory(),
  });

  const remaining = profile?.credits_remaining ?? 0;
  const allowance = Math.max(profile?.credits_allowance ?? 10, remaining);

  const buy = useMutation({
    mutationFn: async (packId: string) => {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment checkout");
      const order = await createCreditOrder({ data: { packId } });

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "LeadFinder",
          description: `${order.packName} — ${order.credits} credits`,
          order_id: order.orderId,
          prefill: { email: profile?.email ?? "", name: profile?.full_name ?? "" },
          theme: { color: "#16a34a" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await verifyCreditPayment({ data: response });
              resolve();
            } catch (error) {
              reject(error as Error);
            }
          },
        });
        rzp.open();
      });
    },
    onSuccess: () => {
      toast.success("Credits added to your account");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["credit-history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Credits & Billing" subtitle="Your monthly credits and credit packs">
      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Credits remaining</h2>
          <span className="tabular-nums text-muted-foreground">
            {remaining.toLocaleString()} / {allowance.toLocaleString()}
          </span>
        </div>
        <Progress value={(remaining / Math.max(allowance, 1)) * 100} className="mt-3 h-2" />
        <p className="mt-3 text-xs text-muted-foreground">
          Free plan includes 10 credits every month
          {profile?.credits_reset_at
            ? ` · renews ${new Date(profile.credits_reset_at).toLocaleDateString()}`
            : ""}
          .
        </p>
      </div>

      {config && !config.configured ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Payments aren't switched on yet. Add your Razorpay Key ID and Key Secret and checkout goes
          live instantly.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {creditPacks.map((pack) => (
          <div
            key={pack.id}
            className={`rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] ${
              pack.popular ? "border-primary ring-1 ring-primary" : "border-border"
            }`}
          >
            {pack.popular ? (
              <span className="mb-2 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-deep">
                Most popular
              </span>
            ) : null}
            <h3 className="font-semibold">{pack.name}</h3>
            <div className="mt-2 text-3xl font-bold">{formatInr(pack.amountPaise)}</div>
            <p className="mt-1 text-sm text-muted-foreground">{pack.tagline}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {pack.credits.toLocaleString()} search credits
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Credits never expire
              </li>
            </ul>
            <Button
              className="mt-5 w-full"
              disabled={buy.isPending}
              onClick={() => buy.mutate(pack.id)}
            >
              Buy credits
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold">Credit activity</h2>
          <div className="mt-3 divide-y divide-border text-sm">
            {(history ?? []).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2">
                <div>
                  <div>{tx.description ?? tx.kind}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`tabular-nums font-semibold ${
                    tx.amount > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
            {(history?.length ?? 0) === 0 ? (
              <p className="py-4 text-muted-foreground">No credit activity yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold">Payments</h2>
          <div className="mt-3 divide-y divide-border text-sm">
            {(payments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div>{formatInr(p.amount_paise)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.credits} credits · {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
              </div>
            ))}
            {(payments?.length ?? 0) === 0 ? (
              <p className="py-4 text-muted-foreground">No payments yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
