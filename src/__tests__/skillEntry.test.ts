// Contract tests for skillEntry.ts / buildSkillOutput.
//
// These tests validate the stable skill output shape — not the engine ranking
// logic (which has its own tests). Their purpose is to catch contract drift at
// the skill boundary and serve as living documentation of the output shape.
//
// Cases:
//   1. surface_oss  — recommendation present, topCandidates populated, confidence set
//   2. continue_direct — searched but no strong match; confidence null, candidates []
//   3. skip_oss with alreadyHave — repo already has the library
//   4. skip_oss silent — config/business-logic skip, no alreadyHave

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildSkillOutput } from "../skillEntry.js";
import type { RepoScoutResult } from "../types.js";

// ── Shared stubs ──────────────────────────────────────────────────────────────

const baseAnalysis: RepoScoutResult["requestAnalysis"] = {
  taskType: "common_infra",
  intent: "Infrastructure: add auth",
  primarySignal: "add auth",
  canonicalFeature: "auth",
  featureTerms: ["add auth", "auth"],
  likelySolvableByOss: true,
  confidence: "high",
};

const baseRepo: RepoScoutResult["repoContext"] = {
  inspected: true,
  language: "typescript",
  framework: "nextjs",
  packageManager: "pnpm",
  uiStack: ["react", "tailwind"],
  authSignals: [],
  dbSignals: [],
  majorDeps: [],
};

const baseClassification: RepoScoutResult["classification"] = {
  category: "unknown",
  shouldSearchOss: false,
  reason: "not applicable",
};

const mockCandidate: RepoScoutResult["ranked"][number] = {
  id: "nextauthjs/next-auth",
  source: "github",
  name: "nextauthjs/next-auth",
  url: "https://github.com/nextauthjs/next-auth",
  npmUrl: "https://www.npmjs.com/package/next-auth",
  score: 91,
  license: "ISC",
  stars: 24000,
  scoreBreakdown: {
    featureMatch: 25,
    stackMatch: 20,
    maintenance: 18,
    licenseSafety: 15,
    popularity: 13,
  },
  explanation: "Matches: auth · TypeScript · maintained within 6 months",
};

// ── 1. surface_oss ────────────────────────────────────────────────────────────

describe("buildSkillOutput — surface_oss", () => {
  const result: RepoScoutResult = {
    task: "add auth to my Next.js app",
    classification: baseClassification,
    requestAnalysis: baseAnalysis,
    repoContext: baseRepo,
    decision: {
      action: "search_oss",
      rationale: "Infrastructure tasks are well-served by OSS libraries (queries tailored for nextjs)",
    },
    queries: ["next-auth nextjs"],
    candidates: [mockCandidate],
    ranked: [mockCandidate],
    recommendation: mockCandidate,
    buildFromScratch: false,
    tradeoffSummary: "nextauthjs/next-auth is the strongest match (91/100).",
  };

  const out = buildSkillOutput(result);

  test("action is surface_oss", () => {
    assert.equal(out.decision.action, "surface_oss");
  });

  test("confidence is a number between 0 and 1", () => {
    assert.ok(typeof out.decision.confidence === "number", "confidence should be a number");
    assert.ok(out.decision.confidence! > 0 && out.decision.confidence! <= 1);
  });

  test("confidence maps score/100 rounded to 2dp", () => {
    assert.equal(out.decision.confidence, 0.91);
  });

  test("topCandidates is non-empty", () => {
    assert.ok(out.topCandidates.length > 0);
  });

  test("topCandidates[0] has full stable shape", () => {
    const c = out.topCandidates[0];
    assert.equal(c.name, "nextauthjs/next-auth");
    assert.equal(c.githubUrl, "https://github.com/nextauthjs/next-auth");
    assert.equal(c.npmUrl, "https://www.npmjs.com/package/next-auth");
    assert.equal(c.score, 91);
    assert.equal(c.license, "ISC");
    assert.equal(c.stars, 24000);
    assert.ok(Array.isArray(c.why) && c.why.length > 0, "why should be a non-empty array");
  });

  test("why splits on · and caps at 3 items", () => {
    const c = out.topCandidates[0];
    assert.deepEqual(c.why, ["Matches: auth", "TypeScript", "maintained within 6 months"]);
  });

  test("alreadyHave is null", () => {
    assert.equal(out.decision.alreadyHave, null);
  });

  test("task echoes input", () => {
    assert.equal(out.task, "add auth to my Next.js app");
  });

  test("requestAnalysis fields are present", () => {
    assert.equal(out.requestAnalysis.taskType, "common_infra");
    assert.equal(out.requestAnalysis.primarySignal, "add auth");
    assert.equal(out.requestAnalysis.likelySolvableByOss, true);
    assert.deepEqual(out.requestAnalysis.featureTerms, ["add auth", "auth"]);
  });
});

// ── 2. continue_direct ────────────────────────────────────────────────────────

describe("buildSkillOutput — continue_direct", () => {
  const result: RepoScoutResult = {
    task: "add a WebRTC video call feature",
    classification: baseClassification,
    requestAnalysis: {
      ...baseAnalysis,
      taskType: "unknown",
      primarySignal: "",
      canonicalFeature: null,
      featureTerms: ["webrtc", "video", "call"],
      likelySolvableByOss: true,
      confidence: "low",
    },
    repoContext: baseRepo,
    decision: {
      action: "search_oss",
      rationale: "Unrecognized feature request — running a general OSS search.",
    },
    queries: ["webrtc video"],
    candidates: [],
    ranked: [],
    recommendation: null,
    buildFromScratch: true,
    tradeoffSummary: "No OSS candidates found. Building from scratch gives full control.",
  };

  const out = buildSkillOutput(result);

  test("action is continue_direct", () => {
    assert.equal(out.decision.action, "continue_direct");
  });

  test("confidence is null", () => {
    assert.equal(out.decision.confidence, null);
  });

  test("topCandidates is empty array", () => {
    assert.deepEqual(out.topCandidates, []);
  });

  test("alreadyHave is null", () => {
    assert.equal(out.decision.alreadyHave, null);
  });
});

// ── 3. skip_oss with alreadyHave ──────────────────────────────────────────────

describe("buildSkillOutput — skip_oss with alreadyHave", () => {
  const result: RepoScoutResult = {
    task: "add login",
    classification: baseClassification,
    requestAnalysis: baseAnalysis,
    repoContext: { ...baseRepo, authSignals: ["next-auth"] },
    decision: {
      action: "skip_oss",
      rationale: "Your repo already has an auth library installed.",
      alreadyHave: "next-auth",
    },
    queries: [],
    candidates: [],
    ranked: [],
    recommendation: null,
    buildFromScratch: false,
    tradeoffSummary: "",
  };

  const out = buildSkillOutput(result);

  test("action is skip_oss", () => {
    assert.equal(out.decision.action, "skip_oss");
  });

  test("alreadyHave is populated", () => {
    assert.equal(out.decision.alreadyHave, "next-auth");
  });

  test("confidence is null", () => {
    assert.equal(out.decision.confidence, null);
  });

  test("topCandidates is empty array", () => {
    assert.deepEqual(out.topCandidates, []);
  });
});

// ── 4. skip_oss silent (no alreadyHave) ───────────────────────────────────────

describe("buildSkillOutput — skip_oss silent", () => {
  const result: RepoScoutResult = {
    task: "fix button spacing",
    classification: baseClassification,
    requestAnalysis: {
      ...baseAnalysis,
      taskType: "config_change",
      primarySignal: "fix spacing",
      canonicalFeature: null,
      featureTerms: ["fix spacing"],
      likelySolvableByOss: false,
      confidence: "high",
    },
    repoContext: baseRepo,
    decision: {
      action: "skip_oss",
      rationale: "Local styling or config change — OSS search would not help here.",
    },
    queries: [],
    candidates: [],
    ranked: [],
    recommendation: null,
    buildFromScratch: true,
    tradeoffSummary: "",
  };

  const out = buildSkillOutput(result);

  test("action is skip_oss", () => {
    assert.equal(out.decision.action, "skip_oss");
  });

  test("alreadyHave is null", () => {
    assert.equal(out.decision.alreadyHave, null);
  });

  test("confidence is null", () => {
    assert.equal(out.decision.confidence, null);
  });

  test("topCandidates is empty array", () => {
    assert.deepEqual(out.topCandidates, []);
  });

  test("reason echoes rationale from engine", () => {
    assert.equal(out.decision.reason, "Local styling or config change — OSS search would not help here.");
  });
});
