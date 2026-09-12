import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { Lead } from "../models/Lead.js";
import { analyzeLead, draftOutreach } from "../services/ai.service.js";
import { isAiConfigured } from "../config/env.js";
import { spendCredits, addCredits } from "../utils/credits.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get("/configured", (_req, res) => res.json({ configured: isAiConfigured }));

aiRouter.post(
  "/leads/:id/analyze",
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params["id"], userId: req.userId });
    if (!lead) throw new HttpError(404, "Lead not found");

    const remaining = await spendCredits({
      userId: req.userId!,
      teamId: req.teamId,
      amount: 1,
      description: `AI analysis: ${lead.name}`,
    });

    try {
      const analysis = await analyzeLead(lead);
      lead.aiAnalysis = analysis;
      await lead.save();
      res.json({ analysis, creditsRemaining: remaining });
    } catch (error) {
      await addCredits({
        userId: req.userId!,
        teamId: req.teamId,
        amount: 1,
        description: "Refund: AI analysis failed",
      });
      throw error;
    }
  }),
);

aiRouter.post(
  "/leads/:id/outreach",
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params["id"], userId: req.userId });
    if (!lead) throw new HttpError(404, "Lead not found");

    const remaining = await spendCredits({
      userId: req.userId!,
      teamId: req.teamId,
      amount: 1,
      description: `AI outreach draft: ${lead.name}`,
    });

    try {
      const draft = await draftOutreach(lead);
      lead.outreach = draft;
      await lead.save();
      res.json({ outreach: draft, creditsRemaining: remaining });
    } catch (error) {
      await addCredits({
        userId: req.userId!,
        teamId: req.teamId,
        amount: 1,
        description: "Refund: AI outreach failed",
      });
      throw error;
    }
  }),
);
