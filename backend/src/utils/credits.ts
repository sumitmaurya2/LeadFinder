import { User, startOfNextMonth } from "../models/User.js";
import { Team } from "../models/Team.js";
import { CreditTransaction } from "../models/CreditTransaction.js";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Spends credits from a user's personal balance, or a team's shared pool when
 * teamId is provided. Resets the monthly allowance first if the reset date has
 * passed. Not a Mongo transaction (no replica set assumed in dev), but the
 * findOneAndUpdate filter makes the deduction itself atomic and race-safe.
 */
export async function spendCredits(params: {
  userId: string;
  teamId?: string | null;
  amount: number;
  description: string;
}): Promise<number> {
  const { userId, teamId, amount, description } = params;

  if (teamId) {
    await Team.updateOne(
      { _id: teamId, creditsResetAt: { $lte: new Date() } },
      [
        {
          $set: {
            creditsRemaining: "$creditsAllowance",
            creditsResetAt: startOfNextMonth(),
          },
        },
      ],
    ).catch(() => undefined); // aggregation pipeline update; ignore if unsupported

    const updated = await Team.findOneAndUpdate(
      { _id: teamId, creditsRemaining: { $gte: amount } },
      { $inc: { creditsRemaining: -amount } },
      { new: true },
    );
    if (!updated) throw new InsufficientCreditsError();

    await CreditTransaction.create({
      userId,
      amount: -amount,
      kind: "usage",
      description: `[team] ${description}`,
    });
    return updated.creditsRemaining;
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.creditsResetAt.getTime() <= Date.now()) {
    user.creditsRemaining = user.creditsAllowance;
    user.creditsResetAt = startOfNextMonth();
    await user.save();
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId, creditsRemaining: { $gte: amount } },
    { $inc: { creditsRemaining: -amount } },
    { new: true },
  );
  if (!updated) throw new InsufficientCreditsError();

  await CreditTransaction.create({ userId, amount: -amount, kind: "usage", description });
  return updated.creditsRemaining;
}

export async function addCredits(params: {
  userId: string;
  teamId?: string | null;
  amount: number;
  description: string;
}): Promise<number> {
  const { userId, teamId, amount, description } = params;

  if (teamId) {
    const updated = await Team.findOneAndUpdate(
      { _id: teamId },
      { $inc: { creditsRemaining: amount } },
      { new: true },
    );
    await CreditTransaction.create({
      userId,
      amount,
      kind: "purchase",
      description: `[team] ${description}`,
    });
    return updated?.creditsRemaining ?? 0;
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { creditsRemaining: amount } },
    { new: true },
  );
  await CreditTransaction.create({ userId, amount, kind: "purchase", description });
  return updated?.creditsRemaining ?? 0;
}
