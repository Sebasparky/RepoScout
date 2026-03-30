/**
 * Server-side GitHub search proxy.
 *
 * Responsibilities:
 *   - Normalize incoming query strings
 *   - Check in-memory TTL cache before hitting GitHub
 *   - Call GitHub public repo search using OAuth App client credentials (server-side only)
 *   - Return a structured response with source-status metadata
 *   - Surface rate-limit / unavailability explicitly rather than silently
 *
 * Nothing in this file should ever be imported by client-side or skill-side code.
 * Credentials are read only from process.env inside this module.
 * Secrets are never written to logs or returned in responses.
 */

import { TtlCache } from "./cache.js";
import type { Candidate } from "../types.js";

const GITHUB_SEARCH_URL = "https://api.github.com/search/repositories";
const PER_QUERY = 5;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type SourceStatus = "normal" | "cache_hit" | "degraded" | "unavailable";

export type SearchResponse = {
  results: Candidate[];
  sourceStatus: SourceStatus;
  cacheHit: boolean;
  rateLimitRemaining?: number;
  degradedReason?: string;
};

// Module-level cache — survives across requests within the same server process.
const cache = new TtlCache<SearchResponse>(CACHE_TTL_MS);

/**
 * Normalize a raw query string before cache lookup or upstream fetch.
 * Lowercase + trim + collapse whitespace — keeps cache keys stable.
 */
export function normalizeQuery(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "reposcout-backend/0.1",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (clientId && clientSecret) {
    // OAuth App unauthenticated flow: client_id + client_secret as Basic auth.
    // Raises the shared rate limit (60/hr) to 5000/hr for the app.
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${encoded}`;
  }

  return headers;
}

type GitHubRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  license: { spdx_id: string } | null;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
  archived: boolean;
};

function repoToCandidate(repo: GitHubRepo): Candidate {
  return {
    id: `github:${repo.full_name}`,
    source: "github",
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? undefined,
    language: repo.language ?? undefined,
    license: repo.license?.spdx_id ?? undefined,
    stars: repo.stargazers_count,
    lastUpdated: repo.pushed_at,
    keywords: repo.topics,
    archived: repo.archived,
    // rawMetadata intentionally omitted — keep the response compact
  };
}

/**
 * Search GitHub public repositories for a single query.
 * Checks cache first; on miss, fetches from GitHub and caches the result.
 */
export async function searchRepos(rawQuery: string): Promise<SearchResponse> {
  const query = normalizeQuery(rawQuery);

  const cached = cache.get(query);
  if (cached) {
    console.log(`[reposcout-backend] cache:hit query="${query}"`);
    return { ...cached, sourceStatus: "cache_hit", cacheHit: true };
  }

  console.log(`[reposcout-backend] cache:miss query="${query}" — fetching upstream`);

  const url =
    `${GITHUB_SEARCH_URL}?q=${encodeURIComponent(query)}` +
    `&sort=stars&order=desc&per_page=${PER_QUERY}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: buildAuthHeaders() });
  } catch (err) {
    // Log full error internally; return sanitized reason to caller (no internal hostnames/stack traces).
    console.error(
      `[reposcout-backend] upstream:unreachable query="${query}" error="${err instanceof Error ? err.message : String(err)}"`,
    );
    return {
      results: [],
      sourceStatus: "unavailable",
      cacheHit: false,
      degradedReason: "Network error reaching GitHub",
    };
  }

  // Read all rate-limit headers for logging and response.
  const rlResource  = res.headers.get("x-ratelimit-resource");
  const rlLimit     = res.headers.get("x-ratelimit-limit");
  const rlRemaining = res.headers.get("x-ratelimit-remaining");
  const rlReset     = res.headers.get("x-ratelimit-reset");
  const remaining   = rlRemaining !== null ? parseInt(rlRemaining, 10) : undefined;

  console.log(
    `[reposcout-backend] upstream:response status=${res.status} ` +
    `rl_resource=${rlResource ?? "-"} rl_limit=${rlLimit ?? "-"} ` +
    `rl_remaining=${rlRemaining ?? "-"} rl_reset=${rlReset ?? "-"} ` +
    `query="${query}"`,
  );

  if (res.status === 403 || res.status === 429) {
    console.warn(
      `[reposcout-backend] upstream:rate_limited status=${res.status} rl_remaining=${rlRemaining ?? "-"} query="${query}"`,
    );
    return {
      results: [],
      sourceStatus: "degraded",
      cacheHit: false,
      rateLimitRemaining: remaining,
      degradedReason: `GitHub rate-limited (HTTP ${res.status})`,
    };
  }

  if (!res.ok) {
    console.error(
      `[reposcout-backend] upstream:error status=${res.status} query="${query}"`,
    );
    return {
      results: [],
      sourceStatus: "unavailable",
      cacheHit: false,
      rateLimitRemaining: remaining,
      degradedReason: `GitHub returned HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as { items?: GitHubRepo[] };
  const results = (data.items ?? []).map(repoToCandidate);

  console.log(
    `[reposcout-backend] upstream:ok results=${results.length} rl_remaining=${rlRemaining ?? "-"} query="${query}"`,
  );

  const response: SearchResponse = {
    results,
    sourceStatus: "normal",
    cacheHit: false,
    rateLimitRemaining: remaining,
  };

  // Only cache successful responses — don't cache errors or rate-limit hits.
  cache.set(query, response);
  return response;
}
