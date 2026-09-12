export type SocialProfiles = {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  youtube: string | null;
  checkedAt: string;
};

const PATTERNS: Record<Exclude<keyof SocialProfiles, "checkedAt">, RegExp> = {
  facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i,
  instagram: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i,
  twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9._-]+/i,
  linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9._-]+/i,
  youtube: /https?:\/\/(www\.)?youtube\.com\/(channel|c|@)[a-zA-Z0-9._-]+/i,
};

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "LeadFinder-SocialCheck/1.0" },
    });
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function findSocialProfiles(website: string): Promise<SocialProfiles> {
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let html = "";
  try {
    html = await fetchHtml(url);
  } catch (error) {
    console.error(`Social check: could not fetch ${url}: ${(error as Error).message}`);
  }

  const result: SocialProfiles = {
    facebook: html.match(PATTERNS.facebook)?.[0] ?? null,
    instagram: html.match(PATTERNS.instagram)?.[0] ?? null,
    twitter: html.match(PATTERNS.twitter)?.[0] ?? null,
    linkedin: html.match(PATTERNS.linkedin)?.[0] ?? null,
    youtube: html.match(PATTERNS.youtube)?.[0] ?? null,
    checkedAt: new Date().toISOString(),
  };

  return result;
}
