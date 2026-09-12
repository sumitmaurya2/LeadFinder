import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const creditTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    kind: { type: String, required: true }, // "usage" | "purchase" | "refund" | "bonus"
    description: { type: String, default: null },
  },
  { timestamps: true },
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });

export type CreditTransactionDoc = InferSchemaType<typeof creditTransactionSchema> & {
  _id: Types.ObjectId;
};
export const CreditTransaction = model("CreditTransaction", creditTransactionSchema);
