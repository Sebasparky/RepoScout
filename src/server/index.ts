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
    const q = url.searchParams.get("q");
    if (!q || !q.trim()) {
      json(400, { error: "Missing or empty query parameter: q" });
      return;
    }

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
