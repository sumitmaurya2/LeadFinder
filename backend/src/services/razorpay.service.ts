import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { Payment } from "../models/Payment.js";
import { addCredits } from "../utils/credits.js";

export class RazorpayNotConfiguredError extends Error {
  constructor() {
    super("Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments.");
    this.name = "RazorpayNotConfiguredError";
  }
}

function credentials() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) throw new RazorpayNotConfiguredError();
  return { keyId: env.razorpayKeyId, keySecret: env.razorpayKeySecret };
}

export async function createOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; keyId: string }> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Razorpay order failed [${response.status}]: ${body}`);
    throw new Error(`Razorpay order failed [${response.status}]`);
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return { id: order.id, amount: order.amount, currency: order.currency, keyId };
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(signature, expected);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.razorpayWebhookSecret) return false;
  const expected = createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  return safeEqual(signature, expected);
}

/** Marks a payment paid exactly once and credits the buyer's account. */
export async function fulfilPayment(orderId: string, paymentId: string | null) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) throw new Error("Payment record not found");
  if (payment.status === "paid") return { alreadyFulfilled: true, credits: payment.credits };

  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "paid" } },
    { status: "paid", razorpayPaymentId: paymentId },
    { new: true },
  );
  if (!updated) return { alreadyFulfilled: true, credits: payment.credits };

  await addCredits({
    userId: String(payment.userId),
    amount: payment.credits,
    description: `Credit pack purchase (${orderId})`,
  });

  return { alreadyFulfilled: false, credits: payment.credits };
}
