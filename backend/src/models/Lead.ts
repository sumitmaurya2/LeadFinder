import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const leadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    searchId: { type: Schema.Types.ObjectId, ref: "Search", default: null, index: true },

    placeId: { type: String, default: null },
    name: { type: String, required: true },
    address: { type: String, default: null },
    phone: { type: String, default: null },
    website: { type: String, default: null },
    category: { type: String, default: null },
    rating: { type: Number, default: null },
    reviews: { type: Number, default: 0 },
    leadScore: { type: Number, default: 0, index: true },
    businessStatus: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    mapsUrl: { type: String, default: null },

    notes: { type: String, default: null },
    saved: { type: Boolean, default: false, index: true },

    // Phase 2
    aiAnalysis: { type: Schema.Types.Mixed, default: null },
    outreach: { type: Schema.Types.Mixed, default: null },
    websiteQuality: { type: Schema.Types.Mixed, default: null },
    socialProfiles: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

leadSchema.index({ userId: 1, createdAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema> & { _id: Types.ObjectId };
export const Lead = model("Lead", leadSchema);
