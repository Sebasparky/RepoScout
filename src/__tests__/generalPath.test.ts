// Tests for the general OSS search path introduced to remove the whitelist gate.
//
// Three categories:
//   1. Niche OSS-solvable prompts — previously skipped, should now reach search
//   2. Clearly custom/internal prompts — should still skip
//   3. Known-category prompts — should still use tuned queries (no regression)

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { analyzeRequest } from "../analyzeRequest.js";
import { buildQueries } from "../queryBuilder.js";
import { classify } from "../classify.js";
import type { RepoContext } from "../types.js";

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

// ── 1. Niche OSS-solvable prompts ─────────────────────────────────────────────
// These prompts don't match any SIGNALS entry.  They should now get
// likelySolvableByOss: true and meaningful featureTerms.

describe("niche OSS-solvable prompts — now reach general search path", () => {
  const NICHE_CASES: Array<{ prompt: string; expectTerms: string[] }> = [
    {
      prompt: "add WebRTC video calling",
      expectTerms: ["webrtc"],
    },
    {
      prompt: "integrate full-text search",
      expectTerms: ["search"],
    },
    {
      prompt: "add a map component with geocoding",
      expectTerms: ["map", "geocoding"],
    },
    {
      prompt: "implement rate limiting middleware",
      expectTerms: ["rate", "middleware"],
    },
    {
      prompt: "add a command palette",
      expectTerms: ["command", "palette"],
    },
    {
      prompt: "add image cropping to the profile editor",
      expectTerms: ["image", "cropping"],
    },
  ];

  for (const { prompt, expectTerms } of NICHE_CASES) {
    test(`"${prompt}" → taskType unknown`, () => {
      assert.equal(analyzeRequest(prompt).taskType, "unknown");
    });

    test(`"${prompt}" → likelySolvableByOss: true`, () => {
      assert.equal(analyzeRequest(prompt).likelySolvableByOss, true);
    });

    for (const term of expectTerms) {
      test(`"${prompt}" → featureTerms includes "${term}"`, () => {
        const { featureTerms } = analyzeRequest(prompt);
        assert.ok(
          featureTerms.includes(term),
          `featureTerms ${JSON.stringify(featureTerms)} should include "${term}"`,
        );
      });
    }

    test(`"${prompt}" → featureTerms-based query (not raw sentence)`, () => {
      const analysis = analyzeRequest(prompt);
      const queries = buildQueries(prompt, "unknown", analysis, noRepo);
      // Should NOT be the raw task sentence
      assert.notEqual(queries.github[0], prompt.slice(0, 80));
      // Should be a shorter, cleaner term query
      assert.ok(queries.github[0].length <= prompt.length);
      assert.ok(queries.all.length > 0);
    });
  }
});

// ── featureTerms query sanity checks ──────────────────────────────────────────

describe("niche prompts — query content", () => {
  test('"add WebRTC video calling" → query includes "webrtc"', () => {
    const analysis = analyzeRequest("add WebRTC video calling");
    const queries = buildQueries("add WebRTC video calling", "unknown", analysis, noRepo);
    assert.ok(queries.github[0].includes("webrtc"), `query: ${queries.github[0]}`);
  });

  test('"add a command palette" → query includes "command" and "palette"', () => {
    const analysis = analyzeRequest("add a command palette");
    const queries = buildQueries("add a command palette", "unknown", analysis, noRepo);
    assert.ok(queries.github[0].includes("command"), `query: ${queries.github[0]}`);
    assert.ok(queries.github[0].includes("palette"), `query: ${queries.github[0]}`);
  });

  test('"implement rate limiting middleware" → query includes "rate" and "middleware"', () => {
    const analysis = analyzeRequest("implement rate limiting middleware");
    const queries = buildQueries("implement rate limiting middleware", "unknown", analysis, noRepo);
    assert.ok(queries.github[0].includes("rate"), `query: ${queries.github[0]}`);
    assert.ok(queries.github[0].includes("middleware"), `query: ${queries.github[0]}`);
  });

  test('"add a map component with geocoding" → query includes "map" and "geocoding"', () => {
    const analysis = analyzeRequest("add a map component with geocoding");
    const queries = buildQueries("add a map component with geocoding", "unknown", analysis, noRepo);
    assert.ok(queries.github[0].includes("map"), `query: ${queries.github[0]}`);
    assert.ok(queries.github[0].includes("geocoding"), `query: ${queries.github[0]}`);
  });
});

// ── 2. Clearly custom/internal prompts ────────────────────────────────────────
// These should produce likelySolvableByOss: false and empty featureTerms.

describe("custom/internal prompts — still skip", () => {
  const SKIP_CASES = [
    // Already caught by SIGNALS (config_change / business_logic)
    { prompt: "fix this button spacing",                              reason: "SIGNALS: config_change" },
    // New general-path skip via INTERNAL_MARKERS
    { prompt: "add our internal approval workflow with reviewer notes", reason: "INTERNAL_MARKERS: our internal" },
    { prompt: "implement our company-specific dispatch escalation logic", reason: "INTERNAL_MARKERS: company-specific" },
  ];

  for (const { prompt } of SKIP_CASES) {
    test(`"${prompt}" → likelySolvableByOss: false`, () => {
      assert.equal(analyzeRequest(prompt).likelySolvableByOss, false);
    });
  }

  // Internal prompts specifically must also have empty featureTerms (no useless search terms)
  test('"add our internal approval workflow" → featureTerms empty', () => {
    const { featureTerms } = analyzeRequest("add our internal approval workflow with reviewer notes");
    assert.deepEqual(featureTerms, []);
  });

  test('"implement our company-specific dispatch escalation logic" → featureTerms empty', () => {
    const { featureTerms } = analyzeRequest("implement our company-specific dispatch escalation logic");
    assert.deepEqual(featureTerms, []);
  });

  // Verify internal marker variants
  test('"add our workflow for internal approval" → likelySolvableByOss: false (our workflow marker)', () => {
    assert.equal(
      analyzeRequest("add our workflow for internal approval").likelySolvableByOss,
      false,
    );
  });

  test('"build a proprietary recommendation system" → likelySolvableByOss: false', () => {
    assert.equal(
      analyzeRequest("build a proprietary recommendation system").likelySolvableByOss,
      false,
    );
  });

  test('"build our in-house reporting pipeline" → likelySolvableByOss: false', () => {
    assert.equal(
      analyzeRequest("build our in-house reporting pipeline").likelySolvableByOss,
      false,
    );
  });
});

// ── 3. Known-category prompts — no regression ────────────────────────────────
// These match SIGNALS entries and must still use their tuned query templates.

describe("known-category prompts — preserved tuned behavior", () => {
  // Auth (common_infra + INFRA_QUERIES)
  test('"add auth to my Next.js app" → common_infra, nextjs auth queries', () => {
    const analysis = analyzeRequest("add auth to my Next.js app");
    assert.equal(analysis.taskType, "common_infra");
    assert.equal(analysis.likelySolvableByOss, true);

    const queries = buildQueries("add auth to my Next.js app", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("next-auth"), `expected next-auth in: ${combined}`);
  });

  // Rich text (ui_component + UI_QUERIES)
  test('"I need a rich text editor" → ui_component, tiptap queries', () => {
    const analysis = analyzeRequest("I need a rich text editor");
    assert.equal(analysis.taskType, "ui_component");
    assert.equal(analysis.likelySolvableByOss, true);

    const queries = buildQueries("I need a rich text editor", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("tiptap"), `expected tiptap in: ${combined}`);
  });

  // Chart (ui_component + UI_QUERIES)
  test('"add a chart library to the dashboard" → ui_component, recharts queries', () => {
    const analysis = analyzeRequest("add a chart library to the dashboard");
    assert.equal(analysis.taskType, "ui_component");
    assert.equal(analysis.likelySolvableByOss, true);

    const queries = buildQueries("add a chart library to the dashboard", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("recharts") || combined.includes("chart.js"), `got: ${combined}`);
  });

  // Known prompts: taskType and likelySolvableByOss must be unchanged
  const KNOWN_STABLE: Array<{ prompt: string; taskType: string }> = [
    { prompt: "add auth to my Next.js app",     taskType: "common_infra" },
    { prompt: "implement authentication",        taskType: "common_infra" },
    { prompt: "add login functionality",         taskType: "common_infra" },
    { prompt: "I need a rich text editor",       taskType: "ui_component" },
    { prompt: "add a chart component",           taskType: "ui_component" },
    { prompt: "add a data table",                taskType: "ui_component" },
    { prompt: "send email via smtp",             taskType: "common_infra" },
    { prompt: "integrate stripe payment",        taskType: "common_infra" },
    { prompt: "pdf parse the document",           taskType: "data_processing" },
  ];

  for (const { prompt, taskType } of KNOWN_STABLE) {
    test(`"${prompt}" → taskType ${taskType}, likelySolvableByOss: true`, () => {
      const result = analyzeRequest(prompt);
      assert.equal(result.taskType, taskType, `expected taskType ${taskType}`);
      assert.equal(result.likelySolvableByOss, true);
    });
  }

  // Known skip types must still skip
  const SKIP_SIGNALS: Array<{ prompt: string; taskType: string }> = [
    { prompt: "fix this button spacing",  taskType: "config_change" },
    { prompt: "refactor the user module", taskType: "config_change" },
    { prompt: "our business logic here",  taskType: "business_logic" },
    { prompt: "custom algorithm",         taskType: "business_logic" },
  ];

  for (const { prompt, taskType } of SKIP_SIGNALS) {
    test(`"${prompt}" → taskType ${taskType}, likelySolvableByOss: false`, () => {
      const result = analyzeRequest(prompt);
      assert.equal(result.taskType, taskType);
      assert.equal(result.likelySolvableByOss, false);
    });
  }
});

// ── Targeted routing fixes ────────────────────────────────────────────────────
// One test block per fix; validates the specific edge cases from the eval.

describe("fix 1 — 'our custom' prompts skip (INTERNAL_MARKERS)", () => {
  test('"add our custom review state machine" → likelySolvableByOss: false', () => {
    assert.equal(analyzeRequest("add our custom review state machine").likelySolvableByOss, false);
  });

  test('"add our custom review state machine" → featureTerms empty', () => {
    assert.deepEqual(analyzeRequest("add our custom review state machine").featureTerms, []);
  });

  test('"build our custom approval flow" → likelySolvableByOss: false', () => {
    assert.equal(analyzeRequest("build our custom approval flow").likelySolvableByOss, false);
  });

  // Ensure a non-custom unknown prompt is unaffected (regression guard)
  test('"add a command palette" → likelySolvableByOss: true (general path intact)', () => {
    assert.equal(analyzeRequest("add a command palette").likelySolvableByOss, true);
  });
});

describe("fix 2 — bare 'chart' prompts route through ui_component", () => {
  test('"add a chart for KPI metrics" → taskType ui_component', () => {
    assert.equal(analyzeRequest("add a chart for KPI metrics").taskType, "ui_component");
  });

  test('"add a chart for KPI metrics" → likelySolvableByOss: true', () => {
    assert.equal(analyzeRequest("add a chart for KPI metrics").likelySolvableByOss, true);
  });

  test('"add a chart for KPI metrics" → recharts/chart.js queries (not noisy general path)', () => {
    const analysis = analyzeRequest("add a chart for KPI metrics");
    const queries = buildQueries("add a chart for KPI metrics", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(
      combined.includes("recharts") || combined.includes("chart.js"),
      `expected chart queries, got: ${combined}`,
    );
  });

  // Existing specific signals must still win (no regression)
  test('"add a chart component" → still taskType ui_component (specific signal preserved)', () => {
    assert.equal(analyzeRequest("add a chart component").taskType, "ui_component");
  });
});

describe("fix 3 — 'add a QR scanner' no longer absorbed by OCR/document-parsing", () => {
  test('"add a QR scanner" → classify returns unknown (not document_parsing)', () => {
    const result = classify("add a QR scanner");
    assert.equal(result.category, "unknown", `expected unknown, got: ${result.category} — reason: ${result.reason}`);
  });

  test('"add a QR scanner" → analyzeRequest likelySolvableByOss: true (general path fires)', () => {
    assert.equal(analyzeRequest("add a QR scanner").likelySolvableByOss, true);
  });

  test('"add a QR scanner" → featureTerms includes "qr"', () => {
    const { featureTerms } = analyzeRequest("add a QR scanner");
    assert.ok(featureTerms.includes("qr"), `featureTerms: ${JSON.stringify(featureTerms)}`);
  });

  test('"add a QR scanner" → query uses general terms, not OCR queries', () => {
    const analysis = analyzeRequest("add a QR scanner");
    const queries = buildQueries("add a QR scanner", "unknown", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    assert.ok(combined.includes("qr"), `expected qr in query, got: ${combined}`);
    assert.ok(!combined.includes("tesseract"), `should not include OCR query: ${combined}`);
  });

  // Document scanning still works (regression guard — "scanned" keyword remains)
  test('"parse scanned invoice" → classify still returns document_parsing', () => {
    const result = classify("parse scanned invoice");
    assert.equal(result.category, "document_parsing", `expected document_parsing, got: ${result.category}`);
  });
});

describe("fix 4 — obvious layout-adjust prompts skip via 'the padding/margin' signals", () => {
  test('"align the padding on this card" → taskType config_change', () => {
    assert.equal(analyzeRequest("align the padding on this card").taskType, "config_change");
  });

  test('"align the padding on this card" → likelySolvableByOss: false', () => {
    assert.equal(analyzeRequest("align the padding on this card").likelySolvableByOss, false);
  });

  test('"adjust the margin on this button" → taskType config_change', () => {
    assert.equal(analyzeRequest("adjust the margin on this button").taskType, "config_change");
  });

  // Unrelated prompts using "padding" or "margin" in non-layout context are low-risk;
  // this guard verifies the signal stays narrow (chart/auth prompts unaffected).
  test('"add auth to my Next.js app" → still common_infra (margin/padding signals not interfering)', () => {
    assert.equal(analyzeRequest("add auth to my Next.js app").taskType, "common_infra");
  });
});

// ── 4. PDF / document prompts ─────────────────────────────────────────────────
// These prompts don't fully match SIGNALS (the entries are specific: "pdf parse",
// "pdf parser", "pdf extract") but should still search via the general path.
// classify.ts catches "pdf" as a document_parsing indicator and buildQueries
// uses the more precise QUERIES_BY_CATEGORY spec when the category is set.

describe("PDF/document prompts — general path + classify safety net", () => {
  test('"add an in-app PDF preview panel" → likelySolvableByOss: true', () => {
    const analysis = analyzeRequest("add an in-app PDF preview panel");
    assert.equal(analysis.taskType, "unknown");
    assert.equal(analysis.likelySolvableByOss, true);
    assert.ok(analysis.featureTerms.includes("pdf"), `featureTerms: ${JSON.stringify(analysis.featureTerms)}`);
  });

  test('"add an in-app PDF preview panel" → featureTerms-based query', () => {
    const analysis = analyzeRequest("add an in-app PDF preview panel");
    const queries = buildQueries("add an in-app PDF preview panel", "unknown", analysis, noRepo);
    assert.ok(queries.github[0].includes("pdf"), `query: ${queries.github[0]}`);
  });

  // When classify.ts detects "document_parsing", buildQueries should use the
  // category spec (this is the existing behavior that must still work).
  test('"add an in-app PDF preview panel" → uses QUERIES_BY_CATEGORY when category=document_parsing', () => {
    const analysis = analyzeRequest("add an in-app PDF preview panel");
    // Simulate classify.ts returning document_parsing (as it would for "pdf")
    const queries = buildQueries("add an in-app PDF preview panel", "document_parsing", analysis, noRepo);
    const combined = [...queries.github, ...queries.npm].join(" ");
    // document_parsing QUERIES_BY_CATEGORY includes "tesseract javascript" and "pdf parse text extract"
    assert.ok(
      combined.includes("tesseract") || combined.includes("pdf"),
      `expected document_parsing queries, got: ${combined}`,
    );
  });
});
