import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { Lead } from "../models/Lead.js";
import { checkWebsiteQuality } from "../services/websiteQuality.service.js";
import { findSocialProfiles } from "../services/social.service.js";

export const qualityRouter = Router();
qualityRouter.use(requireAuth);

qualityRouter.post(
  "/leads/:id/website",
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params["id"], userId: req.userId });
    if (!lead) throw new HttpError(404, "Lead not found");
    if (!lead.website) throw new HttpError(400, "This lead has no website to check");

    const report = await checkWebsiteQuality(lead.website);
    lead.websiteQuality = report;
    await lead.save();
    res.json({ report });
  }),
);

qualityRouter.post(
  "/leads/:id/social",
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params["id"], userId: req.userId });
    if (!lead) throw new HttpError(404, "Lead not found");
    if (!lead.website) throw new HttpError(400, "This lead has no website to scan for social links");

    const profiles = await findSocialProfiles(lead.website);
    lead.socialProfiles = profiles;
    await lead.save();
    res.json({ profiles });
  }),
);
