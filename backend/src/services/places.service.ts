import { env } from "../config/env.js";

export type PlaceResult = {
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviews: number;
  business_status: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.location",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "nextPageToken",
].join(",");

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
};

function normalize(place: RawPlace): PlaceResult {
  return {
    place_id: place.id ?? "",
    name: place.displayName?.text ?? "Unnamed business",
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    category: place.primaryTypeDisplayName?.text ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviews: place.userRatingCount ?? 0,
    business_status: place.businessStatus ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    maps_url: place.googleMapsUri ?? null,
  };
}

export class PlacesNotConfiguredError extends Error {
  constructor() {
    super("Google Maps is not configured. Set GOOGLE_MAPS_API_KEY to search real businesses.");
    this.name = "PlacesNotConfiguredError";
  }
}

/** Text search against Google Places API (New), called directly with your own key. */
export async function searchPlaces(query: string, limit: number): Promise<PlaceResult[]> {
  if (!env.googleMapsApiKey) throw new PlacesNotConfiguredError();

  const results: PlaceResult[] = [];
  let pageToken: string | undefined;
  const maxPages = Math.min(5, Math.ceil(limit / 20));

  for (let page = 0; page < maxPages; page++) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: 20 };
    if (pageToken) body["pageToken"] = pageToken;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsApiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Places request failed [${response.status}]: ${errorBody}`);
      throw new Error(`Google Places request failed [${response.status}]`);
    }

    const data = (await response.json()) as { places?: RawPlace[]; nextPageToken?: string };
    for (const place of data.places ?? []) results.push(normalize(place));

    pageToken = data.nextPageToken;
    if (!pageToken || results.length >= limit) break;
  }

  return results.slice(0, limit);
}
