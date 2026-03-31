import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { analyzeRequest } from "../analyzeRequest.js";
import { buildQueries } from "../queryBuilder.js";
import type { RepoContext } from "../types.js";

// Minimal repo context for query-building tests
const noRepo: RepoContext = {
  inspected: false,
  language: "unknown",
  framework: "unknown",
  uiStack: [],
  packageManager: "unknown",
  authSignals: [],
  dbSignals: [],
  majorDeps: [],
};

// ── Auth synonym cluster ──────────────────────────────────────────────────────

describe("auth synonym cluster — analyzeRequest", () => {
  // All auth-family prompts must be classified the same way.
  const ALL_AUTH_PROMPTS = [
    "add auth to my Next.js app",
    "implement authentication",
    "add login functionality",
    "add sign in and sign up",
    "set up sign up flow",
    "implement signup",
    "add jwt-based authentication",
    "set up sso",
  ];

  for (const prompt of ALL_AUTH_PROMPTS) {
    test(`"${prompt}" → taskType common_infra`, () => {
      assert.equal(analyzeRequest(prompt).taskType, "common_infra");
    });

    test(`"${prompt}" → featureTerms includes "auth"`, () => {
      const { featureTerms } = analyzeRequest(prompt);
      assert.ok(
        featureTerms.includes("auth"),
        `featureTerms ${JSON.stringify(featureTerms)} should include "auth"`,
      );
    });

    test(`"${prompt}" → likelySolvableByOss`, () => {
      assert.equal(analyzeRequest(prompt).likelySolvableByOss, true);
    });
  }

  // Prompts whose signal is in CANONICAL_MAP must produce canonicalFeature "auth".
  // ("add auth" is NOT in the map — its signal already contains "auth", so no
  //  canonical is needed; but "login", "sign in", etc. are in the map.)
  const CANONICALIZED_PROMPTS = [
    "implement authentication",
    "add login functionality",
    "add sign in and sign up",
    "set up sign up flow",
    "implement signup",
    "add jwt-based authentication",
    "set up sso",
  ];

  for (const prompt of CANONICALIZED_PROMPTS) {
    test(`"${prompt}" → canonicalFeature "auth"`, () => {
      assert.equal(analyzeRequest(prompt).canonicalFeature, "auth");
    });
  }
});

// ── Auth synonym cluster — query consistency ──────────────────────────────────

describe("auth synonym cluster — buildQueries (no framework)", () => {
  // These should all resolve to the generic auth INFRA_QUERIES entry.
  const GENERIC_AUTH_PROMPTS = [
    "implement authentication",
    "add login functionality",
    "add sign in and sign up",
    "implement signup",
    "add jwt-based authentication",
    "set up sso",
  ];

  // Derive the reference query set from the first prompt.
  const referenceAnalysis = analyzeRequest(GENERIC_AUTH_PROMPTS[0]);
  const referenceQueries = buildQueries(
    GENERIC_AUTH_PROMPTS[0],
    "unknown",
    referenceAnalysis,
    noRepo,
  );

  for (const prompt of GENERIC_AUTH_PROMPTS.slice(1)) {
    test(`"${prompt}" → same github queries as reference`, () => {
      const analysis = analyzeRequest(prompt);
      const queries = buildQueries(prompt, "unknown", analysis, noRepo);
      assert.deepEqual(
        queries.github,
        referenceQueries.github,
        `expected ${JSON.stringify(queries.github)} to equal ${JSON.stringify(referenceQueries.github)}`,
      );
    });

    test(`"${prompt}" → same npm queries as reference`, () => {
      const analysis = analyzeRequest(prompt);
      const queries = buildQueries(prompt, "unknown", analysis, noRepo);
      assert.deepEqual(
        queries.npm,
        referenceQueries.npm,
        `expected ${JSON.stringify(queries.npm)} to equal ${JSON.stringify(referenceQueries.npm)}`,
      );
    });
  }
});

// ── Framework-aware routing still works ──────────────────────────────────────

describe("auth synonym cluster — framework routing preserved", () => {
  test('"add auth to my Next.js app" routes to nextjs auth queries', () => {
    const analysis = analyzeRequest("add auth to my Next.js app");
    const queries = buildQueries("add auth to my Next.js app", "unknown", analysis, noRepo);
    // nextjs-specific auth queries should include "next-auth"
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("next-auth"), "nextjs queries should mention next-auth");
  });

  test('"add login to my Next.js app" routes to nextjs auth queries', () => {
    const analysis = analyzeRequest("add login to my Next.js app");
    const queries = buildQueries("add login to my Next.js app", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("next-auth"), "login in nextjs context should mention next-auth");
  });

  test('"implement authentication in Next.js" routes to nextjs auth queries', () => {
    const analysis = analyzeRequest("implement authentication in Next.js");
    const queries = buildQueries("implement authentication in Next.js", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("next-auth"), "authentication in nextjs context should mention next-auth");
  });
});

// ── Niche / unmatched features still use general path ────────────────────────

describe("niche/unmatched features — no canonical, general path", () => {
  test("custom recommendation engine → unknown taskType, no canonical", () => {
    const result = analyzeRequest(
      "implement a recommendation engine using collaborative filtering",
    );
    assert.equal(result.taskType, "unknown");
    assert.equal(result.canonicalFeature, null);
    // With the general-path change, niche but borrow-worthy prompts can now reach
    // search; likelySolvableByOss may be true here (that's the intended behavior).
  });

  test("feature flag system → unknown taskType (not in signals), no canonical", () => {
    const result = analyzeRequest("build a feature flag system");
    assert.equal(result.taskType, "unknown");
    assert.equal(result.canonicalFeature, null);
  });

  test("niche prompt uses featureTerms-based query (not raw sentence)", () => {
    const task = "implement rate limiting middleware";
    const analysis = analyzeRequest(task);
    const queries = buildQueries(task, "unknown", analysis, noRepo);
    // Unknown tasks with featureTerms now use a tighter term-based query.
    assert.ok(queries.github.length > 0);
    // The query should contain content terms, not be the raw full sentence.
    const q = queries.github[0];
    assert.ok(q.includes("rate") || q.includes("middleware"), `query: ${q}`);
  });
});

// ── Session context sensitivity ───────────────────────────────────────────────
// "session" alone does not map to auth — only explicit compound signals do.

describe("session — context-sensitive canonicalization", () => {
  test('"implement session management for our game lobby" → not common_infra', () => {
    const result = analyzeRequest("implement session management for our game lobby");
    assert.notEqual(result.taskType, "common_infra",
      "game lobby session should not be classified as common_infra auth");
  });

  test('"implement session management for our game lobby" → featureTerms does not include "auth"', () => {
    const { featureTerms } = analyzeRequest("implement session management for our game lobby");
    assert.ok(
      !featureTerms.includes("auth"),
      `featureTerms ${JSON.stringify(featureTerms)} must not include "auth" for a game lobby prompt`,
    );
  });

  test('"implement session management for our game lobby" → canonicalFeature is null', () => {
    const result = analyzeRequest("implement session management for our game lobby");
    assert.equal(result.canonicalFeature, null);
  });

  test('"implement session management" (bare) → not forced into auth', () => {
    const result = analyzeRequest("implement session management");
    assert.ok(
      !result.featureTerms.includes("auth"),
      `bare "session management" should not inject "auth" into featureTerms`,
    );
  });

  // Explicit auth-adjacent session compounds still route correctly.
  test('"add session token authentication" → common_infra', () => {
    const result = analyzeRequest("add session token authentication");
    assert.equal(result.taskType, "common_infra");
  });

  test('"add session token authentication" → featureTerms includes "auth"', () => {
    const { featureTerms } = analyzeRequest("add session token authentication");
    assert.ok(
      featureTerms.includes("auth"),
      `featureTerms ${JSON.stringify(featureTerms)} should include "auth" for a session token prompt`,
    );
  });

  test('"manage user sessions for the dashboard" → common_infra', () => {
    const result = analyzeRequest("manage user sessions for the dashboard");
    assert.equal(result.taskType, "common_infra");
  });
});

// ── Non-auth signals unaffected ───────────────────────────────────────────────

describe("non-auth signals — canonicalFeature is null where not mapped", () => {
  test("payment signal has no canonical (already routes correctly)", () => {
    const result = analyzeRequest("integrate stripe payment");
    assert.equal(result.taskType, "common_infra");
    // payment/stripe signals contain their own query key, so no canonical needed
    assert.equal(result.canonicalFeature, null);
  });

  test("rich text editor signal has no canonical (already routes correctly)", () => {
    const result = analyzeRequest("add a rich text editor");
    assert.equal(result.taskType, "ui_component");
    assert.equal(result.canonicalFeature, null);
  });

  test("chart signal has no canonical (already routes correctly)", () => {
    const result = analyzeRequest("add a chart component to the dashboard");
    assert.equal(result.taskType, "ui_component");
    assert.equal(result.canonicalFeature, null);
  });
});
