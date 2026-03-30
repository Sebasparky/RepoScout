#!/usr/bin/env node
/**
 * RepoScout backend server.
 *
 * Exposes one endpoint for GitHub public repo search so the RepoScout skill
 * and CLI never need to call GitHub directly or hold any credentials.
 *
 * Endpoints:
 *   GET /health               → { ok: true }
 *   GET /search/repos?q=...   → SearchResponse (see githubProxy.ts)
 *
 * Required env vars (server-side only):
 *   GITHUB_CLIENT_ID      — GitHub OAuth App client ID
 *   GITHUB_CLIENT_SECRET  — GitHub OAuth App client secret
 *
 * Optional:
 *   PORT  — defaults to 3001
 */

import * as http from "node:http";
import { searchRepos } from "./githubProxy.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── Input constraints ─────────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 200;

// ── Per-IP rate limiting (in-memory sliding window) ───────────────────────────
//
// Lightweight anonymous-abuse protection for a public endpoint.
// Limits: RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per source IP.
//
// Caveat: this is per-process only. If multiple instances run behind a load
// balancer without sticky sessions, limits are not shared across instances.
// For this use-case (single small backend), this is intentionally acceptable.
//
// IP is taken from req.socket.remoteAddress. If the server runs behind a
// trusted reverse proxy, set REPOSCOUT_TRUST_PROXY=true to use the first
// address in X-Forwarded-For instead (verify your proxy sets this correctly
// before enabling, as it is user-spoofable otherwise).

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const ipTimestamps = new Map<string, number[]>();

function getClientIp(req: http.IncomingMessage): string {
  if (process.env.REPOSCOUT_TRUST_PROXY === "true") {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0].trim();
      if (first) return first;
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

/** Returns true if the request is allowed, false if rate-limited. */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const prev = ipTimestamps.get(ip) ?? [];
  const within = prev.filter((t) => t > windowStart);

  if (within.length >= RATE_LIMIT_MAX) {
    ipTimestamps.set(ip, within); // keep pruned list, don't record new request
    return false;
  }

  within.push(now);
  ipTimestamps.set(ip, within);

  // Free memory for IPs that have gone quiet.
  if (within.length === 0) ipTimestamps.delete(ip);

  return true;
}

const server = http.createServer(async (req, res) => {
  const base = `http://localhost:${PORT}`;
  let url: URL;
  try {
    url = new URL(req.url ?? "/", base);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad request URI" }));
    return;
  }

  function json(status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    });
    res.end(payload);
  }

  // ── Health check ────────────────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/health") {
    json(200, { ok: true });
    return;
  }

  // ── GitHub repo search ──────────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/search/repos") {
    const ip = getClientIp(req);

    // Per-IP rate limit check.
    if (!checkRateLimit(ip)) {
      console.warn(`[reposcout-backend] rate_limited ip=${ip}`);
      json(429, { error: "Too many requests" });
      return;
    }

    const rawQ = url.searchParams.get("q");

    // Input validation — keep this endpoint narrow.
    if (!rawQ || !rawQ.trim()) {
      json(400, { error: "Missing or empty query parameter: q" });
      return;
    }
    if (rawQ.length > MAX_QUERY_LENGTH) {
      json(400, { error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` });
      return;
    }

    const q = rawQ.trim();
    console.log(`[reposcout-backend] search ip=${ip} q="${q}"`);

    try {
      const result = await searchRepos(q);
      json(200, result);
    } catch (err) {
      console.error("[reposcout-backend] Unhandled error:", err);
      json(500, { error: "Internal server error" });
    }
    return;
  }

  json(404, { error: "Not found" });
});

server.listen(PORT, () => {
  const hasCredentials =
    Boolean(process.env.GITHUB_CLIENT_ID) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET);

  console.log(`[reposcout-backend] listening on port ${PORT}`);
  if (!hasCredentials) {
    console.warn(
      "[reposcout-backend] WARNING: GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set — " +
        "requests will use the unauthenticated rate limit (60 req/hr).",
    );
  }
});

export default server;
