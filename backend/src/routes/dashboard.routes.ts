import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { Lead } from "../models/Lead.js";
import { Search } from "../models/Search.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId;

    const [totalLeads, savedLeads, highOpportunity, searchesRun, recentSearches] = await Promise.all([
      Lead.countDocuments({ userId }),
      Lead.countDocuments({ userId, saved: true }),
      Lead.countDocuments({ userId, leadScore: { $gte: 80 } }),
      Search.countDocuments({ userId }),
      Search.find({ userId }).sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      totalLeads,
      savedLeads,
      highOpportunity,
      searchesRun,
      recentSearches: recentSearches.map((s) => ({
        id: String(s._id),
        keyword: s.keyword,
        location: s.location,
        leads_found: s.leadsFound,
        high_opportunity: s.highOpportunity,
        created_at: s.get("createdAt"),
      })),
    });
  }),
);
