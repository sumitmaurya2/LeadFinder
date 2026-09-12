export type WebsiteQualityReport = {
  reachable: boolean;
  https: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  hasTitle: boolean;
  title: string | null;
  hasMetaDescription: boolean;
  mobileFriendly: boolean;
  score: number; // 0-100
  issues: string[];
  checkedAt: string;
};

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "LeadFinder-QualityCheck/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkWebsiteQuality(website: string): Promise<WebsiteQualityReport> {
  const issues: string[] = [];
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const https = url.startsWith("https://");
  if (!https) issues.push("Site is not served over HTTPS");

  const started = Date.now();
  let statusCode: number | null = null;
  let html = "";
  let reachable = false;

  try {
    const response = await fetchWithTimeout(url);
    statusCode = response.status;
    reachable = response.ok;
    html = await response.text();
    if (!response.ok) issues.push(`Site responded with HTTP ${response.status}`);
  } catch (error) {
    issues.push(`Site did not respond (${(error as Error).message})`);
  }
  const responseTimeMs = reachable ? Date.now() - started : null;

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1]?.trim() || null : null;
  const hasTitle = Boolean(title);
  if (!hasTitle && reachable) issues.push("Missing <title> tag");

  const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
  if (!hasMetaDescription && reachable) issues.push("Missing meta description");

  const mobileFriendly = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!mobileFriendly && reachable) issues.push("Missing mobile viewport meta tag");

  if (reachable && responseTimeMs !== null && responseTimeMs > 3000) {
    issues.push("Slow first response (>3s)");
  }

  let score = 0;
  if (reachable) score += 40;
  if (https) score += 15;
  if (hasTitle) score += 15;
  if (hasMetaDescription) score += 15;
  if (mobileFriendly) score += 15;

  return {
    reachable,
    https,
    statusCode,
    responseTimeMs,
    hasTitle,
    title,
    hasMetaDescription,
    mobileFriendly,
    score,
    issues,
    checkedAt: new Date().toISOString(),
  };
}
