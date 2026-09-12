import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    credits: { type: Number, required: true },
    packId: { type: String, default: null },
    status: { type: String, default: "created" }, // "created" | "paid" | "failed"
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId };
export const Payment = model("Payment", paymentSchema);
