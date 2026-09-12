import type { LeadFilters } from "./leads.schemas";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ── Types ──

export type Lead = {
  id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviews: number;
  lead_score: number;
  business_status: string | null;
  maps_url: string | null;
  saved: boolean;
  notes: string | null;
  ai_analysis: {
    opportunitySummary: string;
    painPoints: string[];
    talkingPoints: string[];
    recommendedApproach: string;
  } | null;
  outreach: { email: { subject: string; body: string }; sms: string } | null;
  website_quality: Record<string, unknown> | null;
  social_profiles: Record<string, unknown> | null;
  created_at: string;
};

export type SearchHistoryItem = {
  id: string;
  keyword: string;
  location: string;
  country: string;
  filters: LeadFilters;
  leads_found: number;
  high_opportunity: number;
  credits_used: number;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  credits_remaining: number;
  credits_allowance: number;
  credits_reset_at: string;
  team_id: string | null;
};

export type DashboardData = {
  totalLeads: number;
  savedLeads: number;
  highOpportunity: number;
  searchesRun: number;
  recentSearches: Array<{
    id: string;
    keyword: string;
    location: string;
    leads_found: number;
    high_opportunity: number;
    created_at: string;
  }>;
};

// ── Auth ──

export function signUp(input: { email: string; password: string; fullName?: string | undefined }) {
  return request<Profile>("/auth/signup", { method: "POST", body: JSON.stringify(input) });
}

export function signIn(input: { email: string; password: string }) {
  return request<Profile>("/auth/signin", { method: "POST", body: JSON.stringify(input) });
}

export function signOut() {
  return request<{ ok: true }>("/auth/signout", { method: "POST" });
}

export function getProfile() {
  return request<Profile>("/auth/me");
}

export function googleSignInUrl() {
  return `${BASE}/auth/google`;
}

// ── Leads ──

export function searchLeads(args: {
  data: { keyword: string; location: string; country: string; limit: number; filters: LeadFilters };
}) {
  return request<{
    searchId: string;
    leads: Lead[];
    source: "api" | "google" | "demo";
    creditsRemaining: number;
  }>("/leads/search", { method: "POST", body: JSON.stringify(args.data) });
}

export function setLeadSaved(args: { data: { ids: string[]; saved: boolean } }) {
  return request<{ ok: true; count: number }>("/leads/save", {
    method: "PATCH",
    body: JSON.stringify(args.data),
  });
}

export function getSavedLeads() {
  return request<Lead[]>("/leads/saved");
}

export function getSearchHistory() {
  return request<SearchHistoryItem[]>("/leads/history");
}

export function getSearchLeads(args: { data: { id: string } }) {
  return request<Lead[]>(`/leads/history/${args.data.id}/leads`);
}

export function deleteSearch(args: { data: { id: string } }) {
  return request<{ ok: true }>(`/leads/history/${args.data.id}`, { method: "DELETE" });
}

export function analyzeLead(leadId: string) {
  return request<{ analysis: Lead["ai_analysis"]; creditsRemaining: number }>(
    `/ai/leads/${leadId}/analyze`,
    { method: "POST" },
  );
}

export function draftOutreach(leadId: string) {
  return request<{ outreach: Lead["outreach"]; creditsRemaining: number }>(
    `/ai/leads/${leadId}/outreach`,
    { method: "POST" },
  );
}

export function checkWebsiteQuality(leadId: string) {
  return request<{ report: Record<string, unknown> }>(`/quality/leads/${leadId}/website`, {
    method: "POST",
  });
}

export function checkSocialProfiles(leadId: string) {
  return request<{ profiles: Record<string, unknown> }>(`/quality/leads/${leadId}/social`, {
    method: "POST",
  });
}

export function aiConfigured() {
  return request<{ configured: boolean }>("/ai/configured");
}

// ── Dashboard / credits ──

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export function getCreditHistory() {
  return request<
    Array<{
      id: string;
      amount: number;
      kind: string;
      description: string | null;
      created_at: string;
    }>
  >("/credits/transactions");
}

// ── Payments ──

export function paymentsConfigured() {
  return request<{ configured: boolean }>("/payments/configured");
}

export function createCreditOrder(args: { data: { packId: string } }) {
  return request<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    credits: number;
    packName: string;
  }>("/payments/create-order", { method: "POST", body: JSON.stringify(args.data) });
}

export function verifyCreditPayment(args: {
  data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
}) {
  return request<{ alreadyFulfilled: boolean; credits: number }>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(args.data),
  });
}

export function getPayments() {
  return request<
    Array<{
      id: string;
      amount_paise: number;
      credits: number;
      pack_id: string | null;
      status: string;
      created_at: string;
    }>
  >("/payments");
}

// ── Teams (Phase 2) ──

export type Team = {
  id: string;
  name: string;
  owner_id: string;
  members: Array<{ user_id: string; role: "owner" | "member"; joined_at: string }>;
  credits_remaining: number;
  credits_allowance: number;
  credits_reset_at: string;
  pending_invites: Array<{ token: string; email: string | null; expires_at: string }>;
};

export function getTeams() {
  return request<Team[]>("/teams");
}

export function createTeam(name: string) {
  return request<Team>("/teams", { method: "POST", body: JSON.stringify({ name }) });
}

export function inviteToTeam(teamId: string, email?: string) {
  return request<{ inviteUrl: string; token: string; expiresAt: string }>(
    `/teams/${teamId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export function joinTeam(token: string) {
  return request<Team>(`/teams/join/${token}`, { method: "POST" });
}

export function leaveTeam(teamId: string) {
  return request<{ ok: true }>(`/teams/${teamId}/leave`, { method: "POST" });
}
