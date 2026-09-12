export type LeadScoreInput = {
  rating: number | null;
  reviews: number;
  website: string | null;
  phone: string | null;
  businessStatus?: string | null;
};

/**
 * Opportunity score: how valuable this business is as a lead.
 * No website + strong demand (many reviews, good rating) = biggest opportunity.
 */
export function computeLeadScore(lead: LeadScoreInput): number {
  let score = 30;

  if (!lead.website) score += 30;
  else score += 4;

  if (lead.phone) score += 12;

  const reviews = lead.reviews ?? 0;
  if (reviews >= 500) score += 18;
  else if (reviews >= 200) score += 15;
  else if (reviews >= 100) score += 12;
  else if (reviews >= 50) score += 9;
  else if (reviews >= 10) score += 5;

  const rating = lead.rating ?? 0;
  if (rating >= 4.5) score += 12;
  else if (rating >= 4.0) score += 9;
  else if (rating >= 3.5) score += 6;
  else if (rating > 0) score += 3;

  if (lead.businessStatus && lead.businessStatus !== "OPERATIONAL") score -= 25;

  return Math.max(1, Math.min(99, Math.round(score)));
}

export function scoreBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}
