import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, index: true },
    fullName: { type: String, default: "" },
    plan: { type: String, default: "free" },

    creditsRemaining: { type: Number, default: 10 },
    creditsAllowance: { type: Number, default: 10 },
    creditsResetAt: { type: Date, default: () => startOfNextMonth() },

    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
  },
  { timestamps: true },
);

export function startOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model("User", userSchema);
