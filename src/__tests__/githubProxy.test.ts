// Tests for the local GitHub search layer.
//
// Covers:
//   1. Query normalization (pure function — no I/O)
//   2. In-memory TTL cache — hit / miss / expiry
//   3. searchGitHub — degraded / normal / cache-hit responses (fetch mocked via globalThis)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuery, searchGitHub } from "../search/github.js";
import { TtlCache } from "../server/cache.js";

// ── 1. normalizeQuery ─────────────────────────────────────────────────────────

describe("normalizeQuery", () => {
  test("lowercases the query", () => {
    assert.equal(normalizeQuery("WebRTC Video"), "webrtc video");
  });

  test("trims leading and trailing whitespace", () => {
    assert.equal(normalizeQuery("  react auth  "), "react auth");
  });

  test("collapses internal whitespace", () => {
    assert.equal(normalizeQuery("date   picker  component"), "date picker component");
  });

  test("handles a clean query unchanged (other than case)", () => {
    assert.equal(normalizeQuery("rate limiting middleware"), "rate limiting middleware");
  });

  test("empty string after trim stays empty", () => {
    assert.equal(normalizeQuery("   "), "");
  });
});

// ── 2. TtlCache ───────────────────────────────────────────────────────────────

describe("TtlCache", () => {
  test("returns undefined for unknown key", () => {
    const c = new TtlCache<string>(1000);
    assert.equal(c.get("missing"), undefined);
  });

  test("returns stored value before expiry", () => {
    const c = new TtlCache<string>(60_000);
    c.set("k", "v");
    assert.equal(c.get("k"), "v");
  });

  test("returns undefined after TTL expires", async () => {
    const c = new TtlCache<string>(10); // 10 ms TTL
    c.set("k", "v");
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(c.get("k"), undefined);
  });

  test("has() returns true for live entry", () => {
    const c = new TtlCache<number>(60_000);
    c.set("x", 42);
    assert.equal(c.has("x"), true);
  });

  test("has() returns false for expired entry", async () => {
    const c = new TtlCache<number>(10);
    c.set("x", 42);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(c.has("x"), false);
  });

  test("overwrites an existing key", () => {
    const c = new TtlCache<string>(60_000);
    c.set("k", "first");
    c.set("k", "second");
    assert.equal(c.get("k"), "second");
  });
});

// ── 3. searchGitHub — local direct search ────────────────────────────────────
//
// We patch globalThis.fetch before each call and restore it after.
// Unique query strings are used per test to avoid cross-test cache collisions.

describe("searchGitHub — degraded responses", () => {
  test("returns empty array when GitHub returns 429", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 429,
        headers: { "x-ratelimit-remaining": "0" },
      }) as Response;

    try {
      const results = await searchGitHub(["__local_test_rate_limit_unique_a__"]);
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("returns empty array when fetch throws a network error", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Connection refused");
    };

    try {
      const results = await searchGitHub(["__local_test_network_error_unique_b__"]);
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("returns candidates on a successful response", async () => {
    const mockItems = [
      {
        id: 1,
        full_name: "owner/test-repo",
        html_url: "https://github.com/owner/test-repo",
        description: "a test repo",
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        stargazers_count: 1000,
        pushed_at: "2024-06-01T00:00:00Z",
        topics: ["typescript"],
        archived: false,
      },
    ];

    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: mockItems }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "59" },
      }) as Response;

    try {
      const results = await searchGitHub(["__local_test_success_unique_c__"]);
      assert.equal(results.length, 1);
      assert.equal(results[0].name, "owner/test-repo");
      assert.equal(results[0].source, "github");
      assert.equal(results[0].stars, 1000);
      assert.equal(results[0].license, "MIT");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("second call for same query is served from in-process cache", async () => {
    const original = globalThis.fetch;
    let fetchCallCount = 0;
    const mockItems = [
      {
        id: 2,
        full_name: "owner/cached-repo",
        html_url: "https://github.com/owner/cached-repo",
        description: "cache test",
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        stargazers_count: 500,
        pushed_at: "2024-06-01T00:00:00Z",
        topics: [],
        archived: false,
      },
    ];

    globalThis.fetch = async () => {
      fetchCallCount++;
      return new Response(JSON.stringify({ items: mockItems }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "58" },
      }) as Response;
    };

    try {
      const q = "__local_test_cache_hit_unique_d__";
      const first = await searchGitHub([q]);
      assert.equal(first.length, 1);
      assert.equal(first[0].name, "owner/cached-repo");

      const callsAfterFirst = fetchCallCount;

      const second = await searchGitHub([q]);
      assert.equal(second.length, 1);
      assert.equal(fetchCallCount, callsAfterFirst, "fetch must not be called on cache hit");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("deduplicates results across multiple queries returning the same repo", async () => {
    const original = globalThis.fetch;
    const mockItem = {
      id: 3,
      full_name: "owner/dedup-repo",
      html_url: "https://github.com/owner/dedup-repo",
      description: "dedup test",
      language: "Go",
      license: null,
      stargazers_count: 200,
      pushed_at: "2024-01-01T00:00:00Z",
      topics: [],
      archived: false,
    };

    // Both queries return the same repo — only one should appear in results.
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [mockItem] }), {
        status: 200,
        headers: {},
      }) as Response;

    try {
      const results = await searchGitHub([
        "__local_test_dedup_q1_unique_e__",
        "__local_test_dedup_q2_unique_f__",
      ]);
      const names = results.map((r) => r.name);
      assert.equal(
        names.filter((n) => n === "owner/dedup-repo").length,
        1,
        "same repo should appear only once after dedup",
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
