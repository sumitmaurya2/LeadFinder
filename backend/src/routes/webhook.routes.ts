import { Router, raw } from "express";
import { verifyWebhookSignature, fulfilPayment } from "../services/razorpay.service.js";

export const webhookRouter = Router();

// Mounted with express.raw() so we can verify the exact bytes Razorpay signed.
webhookRouter.post("/razorpay", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("x-razorpay-signature") ?? "";
  const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : "";

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  let payload: { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).send("Invalid payload");
  }

  const entity = payload.payload?.payment?.entity;
  if (payload.event === "payment.captured" && entity?.order_id) {
    try {
      await fulfilPayment(entity.order_id, entity.id ?? null);
    } catch (error) {
      console.error("Razorpay fulfilment failed", error);
      return res.status(500).send("Fulfilment failed");
    }
  }

  res.send("ok");
});
