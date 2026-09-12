import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const teamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const teamInviteSchema = new Schema(
  {
    token: { type: String, required: true },
    email: { type: String, default: null },
    role: { type: String, enum: ["member"], default: "member" },
    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [teamMemberSchema], default: [] },
    invites: { type: [teamInviteSchema], default: [] },

    // Shared credit pool used for searches run "as team".
    creditsRemaining: { type: Number, default: 50 },
    creditsAllowance: { type: Number, default: 50 },
    creditsResetAt: { type: Date, default: () => startOfNextMonth() },
  },
  { timestamps: true },
);

function startOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export type TeamDoc = InferSchemaType<typeof teamSchema> & { _id: Types.ObjectId };
export const Team = model("Team", teamSchema);
