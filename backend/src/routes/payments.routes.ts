import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { getPack } from "../data/creditPacks.js";
import { createOrder, verifyCheckoutSignature, fulfilPayment } from "../services/razorpay.service.js";
import { Payment } from "../models/Payment.js";
import { isRazorpayConfigured } from "../config/env.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.get("/configured", (_req, res) => {
  res.json({ configured: isRazorpayConfigured });
});

const createOrderSchema = z.object({ packId: z.string().min(1).max(40) });

paymentsRouter.post(
  "/create-order",
  asyncHandler(async (req, res) => {
    const { packId } = createOrderSchema.parse(req.body);
    const pack = getPack(packId);
    if (!pack) throw new HttpError(400, "Unknown credit pack");

    const order = await createOrder({
      amountPaise: pack.amountPaise,
      receipt: `lf_${String(req.userId).slice(0, 8)}_${Date.now()}`,
      notes: { user_id: req.userId!, pack_id: pack.id, credits: String(pack.credits) },
    });

    await Payment.create({
      userId: req.userId,
      razorpayOrderId: order.id,
      amountPaise: pack.amountPaise,
      credits: pack.credits,
      packId: pack.id,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      credits: pack.credits,
      packName: pack.name,
    });
  }),
);

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(8),
});

paymentsRouter.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const input = verifyPaymentSchema.parse(req.body);
    const valid = verifyCheckoutSignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature,
    );
    if (!valid) throw new HttpError(400, "Payment signature verification failed");
    const result = await fulfilPayment(input.razorpay_order_id, input.razorpay_payment_id);
    res.json(result);
  }),
);

paymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const payments = await Payment.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(25);
    res.json(
      payments.map((p) => ({
        id: String(p._id),
        amount_paise: p.amountPaise,
        credits: p.credits,
        pack_id: p.packId,
        status: p.status,
        created_at: p.get("createdAt"),
      })),
    );
  }),
);
