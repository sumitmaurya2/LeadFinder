import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const searchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    keyword: { type: String, required: true },
    location: { type: String, required: true },
    country: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    leadsFound: { type: Number, default: 0 },
    highOpportunity: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 1 },
  },
  { timestamps: true },
);

searchSchema.index({ userId: 1, createdAt: -1 });

export type SearchDoc = InferSchemaType<typeof searchSchema> & { _id: Types.ObjectId };
export const Search = model("Search", searchSchema);
