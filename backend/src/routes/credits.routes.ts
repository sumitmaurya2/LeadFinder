import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { CreditTransaction } from "../models/CreditTransaction.js";

export const creditsRouter = Router();
creditsRouter.use(requireAuth);

creditsRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const tx = await CreditTransaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(
      tx.map((t) => ({
        id: String(t._id),
        amount: t.amount,
        kind: t.kind,
        description: t.description,
        created_at: t.get("createdAt"),
      })),
    );
  }),
);
