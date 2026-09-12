import { env, isAiConfigured } from "../config/env.js";
import type { LeadDoc } from "../models/Lead.js";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured. Set ANTHROPIC_API_KEY to enable lead analysis and outreach drafts.");
    this.name = "AiNotConfiguredError";
  }
}

async function callClaude(system: string, userMessage: string): Promise<string> {
  if (!isAiConfigured) throw new AiNotConfiguredError();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.aiModel,
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Anthropic API failed [${response.status}]: ${body.slice(0, 500)}`);
    throw new Error(`AI request failed [${response.status}]`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("AI response contained no text");
  return text;
}

function stripJsonFences(text: string): string {
  return text.replace(/```json\s*|```/g, "").trim();
}

export type LeadAnalysis = {
  opportunitySummary: string;
  painPoints: string[];
  talkingPoints: string[];
  recommendedApproach: string;
};

export async function analyzeLead(lead: Pick<
  LeadDoc,
  "name" | "category" | "rating" | "reviews" | "website" | "phone" | "leadScore" | "businessStatus"
>): Promise<LeadAnalysis> {
  const system =
    "You are a sales research assistant for a local-business lead generation tool. " +
    "Given structured facts about a business, return ONLY a JSON object with keys " +
    '"opportunitySummary" (1-2 sentences), "painPoints" (array of 2-4 short strings), ' +
    '"talkingPoints" (array of 2-4 short strings a salesperson could open with), and ' +
    '"recommendedApproach" (1-2 sentences on channel/tone). No prose outside the JSON.';

  const userMessage = JSON.stringify({
    name: lead.name,
    category: lead.category,
    rating: lead.rating,
    reviews: lead.reviews,
    hasWebsite: Boolean(lead.website),
    hasPhone: Boolean(lead.phone),
    opportunityScore: lead.leadScore,
    businessStatus: lead.businessStatus,
  });

  const text = await callClaude(system, userMessage);
  try {
    return JSON.parse(stripJsonFences(text)) as LeadAnalysis;
  } catch {
    throw new Error("Could not parse AI analysis response");
  }
}

export type OutreachDraft = { email: { subject: string; body: string }; sms: string };

export async function draftOutreach(lead: Pick<
  LeadDoc,
  "name" | "category" | "rating" | "reviews" | "website" | "aiAnalysis"
>): Promise<OutreachDraft> {
  const system =
    "You are a friendly, non-pushy sales copywriter reaching out to small local businesses " +
    "on behalf of an agency offering websites/digital marketing. Return ONLY a JSON object with " +
    'keys "email" ({"subject": string, "body": string, under 120 words}) and "sms" (under 300 characters). ' +
    "Personalize using the business name and category. No prose outside the JSON.";

  const userMessage = JSON.stringify({
    name: lead.name,
    category: lead.category,
    rating: lead.rating,
    reviews: lead.reviews,
    hasWebsite: Boolean(lead.website),
    analysis: lead.aiAnalysis ?? null,
  });

  const text = await callClaude(system, userMessage);
  try {
    return JSON.parse(stripJsonFences(text)) as OutreachDraft;
  } catch {
    throw new Error("Could not parse AI outreach response");
  }
}
