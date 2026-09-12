import { env } from "../config/env.js";
import type { PlaceResult } from "./places.service.js";
import { PlacesNotConfiguredError, searchPlaces } from "./places.service.js";

/**
 * Lead source resolution order:
 *  1. LEADS_API_URL -> your own FastAPI (or any HTTP) scraping service
 *  2. GOOGLE_MAPS_API_KEY -> direct Google Places API (New) call
 *  3. Demo dataset -> keeps the product usable before either is configured
 */

type RawRow = Record<string, unknown>;

function str(row: RawRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function num(row: RawRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export function normalizeScrapedRow(row: RawRow, index: number): PlaceResult {
  const status = str(row, "business_status", "businessStatus", "status");
  return {
    place_id: str(row, "place_id", "placeId", "id", "cid") ?? `api-${index}`,
    name: str(row, "name", "title", "business_name", "businessName") ?? "Unnamed business",
    address: str(row, "address", "formatted_address", "full_address", "location"),
    phone: str(row, "phone", "phone_number", "phoneNumber", "number", "contact"),
    website: str(row, "website", "site", "url", "domain"),
    category: str(row, "category", "type", "categories", "primary_type"),
    rating: num(row, "rating", "stars", "score"),
    reviews: num(row, "reviews", "review_count", "reviewsCount", "user_ratings_total") ?? 0,
    business_status: status ?? "OPERATIONAL",
    latitude: num(row, "latitude", "lat"),
    longitude: num(row, "longitude", "lng", "lon"),
    maps_url: str(row, "maps_url", "google_maps_url", "mapsUrl", "link"),
  };
}

function extractRows(payload: unknown): RawRow[] {
  if (Array.isArray(payload)) return payload as RawRow[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["results", "data", "leads", "businesses", "items"]) {
      if (Array.isArray(obj[key])) return obj[key] as RawRow[];
    }
  }
  return [];
}

export type ScrapeRequest = { keyword: string; location: string; country: string; limit: number };

async function fetchFromFastApi(url: string, req: ScrapeRequest): Promise<PlaceResult[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.leadsApiKey) {
    headers["Authorization"] = `Bearer ${env.leadsApiKey}`;
    headers["X-API-Key"] = env.leadsApiKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      keyword: req.keyword,
      query: req.keyword,
      business_type: req.keyword,
      location: req.location,
      country: req.country,
      limit: req.limit,
      max_results: req.limit,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Lead API failed [${response.status}]: ${body.slice(0, 500)}`);
    throw new Error(`Your lead API returned ${response.status}. Check the service and try again.`);
  }

  const rows = extractRows(await response.json());
  return rows.slice(0, req.limit).map(normalizeScrapedRow);
}

const DEMO_NAMES = [
  ["Brew & Bloom Cafe", "cafe", 4.6, 412, null],
  ["The Corner Espresso Bar", "cafe", 4.3, 188, "https://cornerespresso.example.com"],
  ["Sunrise Bakery & Coffee", "bakery", 4.8, 921, null],
  ["Urban Grind Coffee House", "cafe", 4.1, 76, null],
  ["Mocha Lane", "cafe", 3.9, 44, "https://mochalane.example.com"],
  ["Leafy Bean Roasters", "coffee roaster", 4.7, 268, null],
  ["Cuppa Corner", "cafe", 4.0, 133, null],
  ["Bistro 42", "restaurant", 4.4, 507, "https://bistro42.example.com"],
  ["Daily Drip", "cafe", 4.2, 61, null],
  ["Hearth & Crumb", "bakery", 4.9, 1043, null],
  ["The Chai Post", "tea house", 4.5, 322, null],
  ["Filter Room", "cafe", 3.7, 29, null],
] as const;

function demoResults(req: ScrapeRequest): PlaceResult[] {
  return DEMO_NAMES.slice(0, req.limit).map((row, index) => ({
    place_id: `demo-${index}`,
    name: row[0],
    address: `${12 + index * 7} Main Street, ${req.location}`,
    phone: `+91 98${String(10000000 + index * 13571).slice(0, 8)}`,
    website: row[4],
    category: row[1],
    rating: row[2],
    reviews: row[3],
    business_status: "OPERATIONAL",
    latitude: null,
    longitude: null,
    maps_url: `https://www.google.com/maps/search/${encodeURIComponent(`${row[0]} ${req.location}`)}`,
  }));
}

export async function fetchBusinesses(
  req: ScrapeRequest,
): Promise<{ results: PlaceResult[]; source: "api" | "google" | "demo" }> {
  if (env.leadsApiUrl) {
    return { results: await fetchFromFastApi(env.leadsApiUrl, req), source: "api" };
  }

  try {
    const results = await searchPlaces(`${req.keyword} in ${req.location}, ${req.country}`, req.limit);
    return { results, source: "google" };
  } catch (error) {
    if (error instanceof PlacesNotConfiguredError) {
      return { results: demoResults(req), source: "demo" };
    }
    throw error;
  }
}
