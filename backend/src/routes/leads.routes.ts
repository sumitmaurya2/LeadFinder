import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { Search } from "../models/Search.js";
import { Lead } from "../models/Lead.js";
import { computeLeadScore } from "../services/leadScore.js";
import { fetchBusinesses } from "../services/scraper.service.js";
import { spendCredits, addCredits } from "../utils/credits.js";

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const filtersSchema = z.object({
  minRating: z.number().nullable().default(null),
  minReviews: z.number().nullable().default(null),
  website: z.enum(["any", "has", "none"]).default("any"),
  phone: z.enum(["any", "has", "none"]).default("any"),
  status: z.enum(["any", "operational", "closed"]).default("any"),
  minScore: z.number().nullable().default(null),
});
type LeadFilters = z.infer<typeof filtersSchema>;

const searchInputSchema = z.object({
  keyword: z.string().min(2).max(120),
  location: z.string().min(2).max(160),
  country: z.string().min(2).max(100),
  limit: z.number().int().min(10).max(100).default(20),
  filters: filtersSchema.default({}),
});

const idParamSchema = z.object({ id: z.string().min(1) });
const saveSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200), saved: z.boolean() });

function passesFilters(
  lead: {
    rating: number | null;
    reviews: number;
    website: string | null;
    phone: string | null;
    business_status: string | null;
    score: number;
  },
  f: LeadFilters,
) {
  if (f.minRating !== null && (lead.rating ?? 0) < f.minRating) return false;
  if (f.minReviews !== null && lead.reviews < f.minReviews) return false;
  if (f.website === "has" && !lead.website) return false;
  if (f.website === "none" && lead.website) return false;
  if (f.phone === "has" && !lead.phone) return false;
  if (f.phone === "none" && lead.phone) return false;
  if (f.status === "operational" && lead.business_status !== "OPERATIONAL") return false;
  if (f.status === "closed" && lead.business_status === "OPERATIONAL") return false;
  if (f.minScore !== null && lead.score < f.minScore) return false;
  return true;
}

function serializeLead(lead: {
  _id: unknown;
  placeId?: string | null;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  rating?: number | null;
  reviews: number;
  leadScore: number;
  businessStatus?: string | null;
  mapsUrl?: string | null;
  saved: boolean;
  notes?: string | null;
  aiAnalysis?: unknown;
  outreach?: unknown;
  websiteQuality?: unknown;
  socialProfiles?: unknown;
  get(key: string): unknown;
}) {
  return {
    id: String(lead._id),
    place_id: lead.placeId,
    name: lead.name,
    address: lead.address,
    phone: lead.phone,
    website: lead.website,
    category: lead.category,
    rating: lead.rating,
    reviews: lead.reviews,
    lead_score: lead.leadScore,
    business_status: lead.businessStatus,
    maps_url: lead.mapsUrl,
    saved: lead.saved,
    notes: lead.notes,
    ai_analysis: lead.aiAnalysis,
    outreach: lead.outreach,
    website_quality: lead.websiteQuality,
    social_profiles: lead.socialProfiles,
    created_at: lead.get("createdAt"),
  };
}

leadsRouter.post(
  "/search",
  asyncHandler(async (req, res) => {
    const input = searchInputSchema.parse(req.body);
    const userId = req.userId!;
    const teamId = req.teamId ?? null;

    const remaining = await spendCredits({
      userId,
      teamId,
      amount: 1,
      description: `Search: ${input.keyword} in ${input.location}, ${input.country}`,
    });

    let places: Awaited<ReturnType<typeof fetchBusinesses>>["results"] = [];
    let source: Awaited<ReturnType<typeof fetchBusinesses>>["source"] = "demo";
    try {
      const found = await fetchBusinesses({
        keyword: input.keyword,
        location: input.location,
        country: input.country,
        limit: input.limit,
      });
      places = found.results;
      source = found.source;
    } catch (error) {
      await addCredits({ userId, teamId, amount: 1, description: "Refund: search failed" });
      throw error;
    }

    const scored = places
      .map((place) => ({ ...place, score: computeLeadScore(place) }))
      .filter((place) => passesFilters(place, input.filters))
      .sort((a, b) => b.score - a.score);

    const highOpportunity = scored.filter((l) => l.score >= 80).length;

    const search = await Search.create({
      userId,
      teamId,
      keyword: input.keyword,
      location: input.location,
      country: input.country,
      filters: input.filters,
      leadsFound: scored.length,
      highOpportunity,
      creditsUsed: 1,
    });

    const leadDocs = scored.length
      ? await Lead.insertMany(
          scored.map((place) => ({
            userId,
            teamId,
            searchId: search._id,
            placeId: place.place_id,
            name: place.name,
            address: place.address,
            phone: place.phone,
            website: place.website,
            category: place.category,
            rating: place.rating,
            reviews: place.reviews,
            leadScore: place.score,
            businessStatus: place.business_status,
            latitude: place.latitude,
            longitude: place.longitude,
            mapsUrl: place.maps_url,
          })),
        )
      : [];

    leadDocs.sort((a, b) => b.leadScore - a.leadScore);

    res.json({
      searchId: String(search._id),
      leads: leadDocs.map(serializeLead),
      source,
      creditsRemaining: remaining,
    });
  }),
);

leadsRouter.get(
  "/saved",
  asyncHandler(async (req, res) => {
    const leads = await Lead.find({ userId: req.userId, saved: true }).sort({ leadScore: -1 });
    res.json(leads.map(serializeLead));
  }),
);

leadsRouter.patch(
  "/save",
  asyncHandler(async (req, res) => {
    const input = saveSchema.parse(req.body);
    await Lead.updateMany(
      { userId: req.userId, _id: { $in: input.ids } },
      { $set: { saved: input.saved } },
    );
    res.json({ ok: true, count: input.ids.length });
  }),
);

leadsRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const searches = await Search.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
    res.json(
      searches.map((s) => ({
        id: String(s._id),
        keyword: s.keyword,
        location: s.location,
        country: s.country,
        filters: s.filters,
        leads_found: s.leadsFound,
        high_opportunity: s.highOpportunity,
        credits_used: s.creditsUsed,
        created_at: s.get("createdAt"),
      })),
    );
  }),
);

leadsRouter.get(
  "/history/:id/leads",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const leads = await Lead.find({ userId: req.userId, searchId: id }).sort({ leadScore: -1 });
    res.json(leads.map(serializeLead));
  }),
);

leadsRouter.delete(
  "/history/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const search = await Search.findOneAndDelete({ userId: req.userId, _id: id });
    if (!search) throw new HttpError(404, "Search not found");
    await Lead.deleteMany({ userId: req.userId, searchId: id });
    res.json({ ok: true });
  }),
);

leadsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const lead = await Lead.findOne({ userId: req.userId, _id: id });
    if (!lead) throw new HttpError(404, "Lead not found");
    res.json(serializeLead(lead));
  }),
);
