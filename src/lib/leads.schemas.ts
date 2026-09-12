import { z } from "zod";

export const filtersSchema = z.object({
  minRating: z.number().nullable().default(null),
  minReviews: z.number().nullable().default(null),
  website: z.enum(["any", "has", "none"]).default("any"),
  phone: z.enum(["any", "has", "none"]).default("any"),
  status: z.enum(["any", "operational", "closed"]).default("any"),
  minScore: z.number().nullable().default(null),
});

export type LeadFilters = z.infer<typeof filtersSchema>;

export const defaultFilters: LeadFilters = {
  minRating: null,
  minReviews: null,
  website: "any",
  phone: "any",
  status: "any",
  minScore: null,
};
