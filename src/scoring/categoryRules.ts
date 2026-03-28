import { Category } from "../types.js";

export type CategoryRule = {
  // Keywords that strongly signal the candidate matches the task category.
  coreFeatureKeywords: string[];
  // Bonus keywords that increase confidence but aren't required.
  bonusKeywords: string[];
  // If any of these appear, the candidate almost certainly matches.
  // These should be library/tool *identity* names, not generic format names.
  strongSignals: string[];
  // Stack keywords that confirm JS/TS compatibility.
  stackKeywords: string[];
  // Substrings that flag a repo as the wrong *type* for this category
  // (e.g. MCP server, AI agent, demo app). When matched, featureMatch is
  // capped at a low value so the repo can't crowd out real libraries.
  antiPatterns: string[];
  // Off-topic signals: terms that suggest the repo's primary domain is
  // unrelated to this category. Each match deducts 3 pts from featureMatch.
  // Only applied when the repo has no name-level strong signal (confirmed
  // libraries are immune — a PDF link-extractor won't be penalised for
  // having "link" in its name).
  negativeSignals: string[];
};

const RULES: Record<Exclude<Category, "unknown">, CategoryRule> = {
  document_parsing: {
    // Identity-level signals: these are names of well-known libraries/engines.
    // Matching one of these in a repo name or description strongly implies the
    // repo IS a document-parsing tool, not merely a consumer of one.
    // Note: "docx" removed — it's a file format, not a library identity signal.
    // Multi-tools that parse docx as one of many inputs would score unfairly high.
    strongSignals: [
      "tesseract", "pdfjs", "pdf.js", "pdf-lib", "pdf-parse",
      "poppler", "ghostscript", "mammoth",
      "pdf2json", "textract", "pdfminer", "node-poppler",
    ],
    coreFeatureKeywords: [
      "ocr", "pdf", "document", "parse", "extract", "text recognition",
      "optical character", "scan", "invoice", "receipt",
      "docx",  // file format: useful signal but not library identity
    ],
    bonusKeywords: [
      "local", "offline", "wasm", "webassembly", "native",
      "image", "vision", "layout", "table",
    ],
    stackKeywords: [
      "typescript", "javascript", "node", "nodejs", "npm",
      "browser", "wasm", "esm",
    ],
    // Repos matching any of these are clearly the wrong *type* for a reusable
    // document-parsing library. featureMatch is hard-capped when these fire.
    // Keep this list narrow and specific to avoid false positives.
    antiPatterns: [
      "model context protocol",  // MCP servers (description pattern)
      "mcp-server",              // explicit MCP server repos
      "-mcp",                    // kebab-case MCP repos (e.g. foo-researcher-mcp)
    ],
    // Off-topic terms for document parsing. Each hit deducts 3 pts from
    // featureMatch (only when no name-level strong signal is present).
    negativeSignals: [
      "link",        // URL link tools (links-detector, link-checker…)
      "links",
      "clickable",   // app-level output language — libraries don't make things clickable
      "smartphone",  // consumer device target, not a Node.js library concern
      "qr",          // QR/barcode scanning — distinct domain
    ],
  },
};

export function getRulesForCategory(category: Category): CategoryRule | null {
  if (category === "unknown") return null;
  return RULES[category] ?? null;
}

// Score feature match for a candidate against the category rules.
//
// shortName   — repo's own identifier stripped of owner prefix ("tesseract.js",
//               "pdf-parse"). A strong signal here means the repo's PRIMARY PURPOSE
//               is this category.
// description — description text only (no name, no keywords). Strong signals here
//               are incidental/consumer mentions.
// keywords    — topics or package keywords array. Strong signals here mean the
//               repo uses/relates to that technology (not necessarily IS it).
//
// Returns 0–30. The score tiers by WHERE a strong signal is found:
//
//   Name   → identity signal  (14 pts each + 8-pt name boost): this repo IS the library
//   Topics → usage signal     (6 pts each):  this repo USES the library
//   Desc   → mention signal   (3 pts each):  incidental consumer mention
//
// Repos with no name-level strong signal are capped at 20. This prevents apps that
// merely consume an OCR/PDF library (e.g. links-detector uses tesseract as a dep)
// from outscoring dedicated libraries (tesseract.js, pdf-parse, pdf.js…).
export function scoreFeatureMatch(
  shortName: string,
  description: string,
  keywords: string[],
  rules: CategoryRule
): { score: number; matched: string[]; antiPatternHit: boolean } {
  const nameLower = shortName.toLowerCase();
  const topicsLower = keywords.join(" ").toLowerCase();
  const descLower = description.toLowerCase();
  // Combined surface used for core/bonus keyword matching.
  const combined = [nameLower, descLower, topicsLower].join(" ");

  // --- Bucket each strong signal into the highest-confidence location found.
  //     Each signal is counted once (name wins over topics, topics over desc).
  const nameStrong: string[] = [];
  const topicStrong: string[] = [];
  const descStrong: string[] = [];

  for (const sig of rules.strongSignals) {
    if (nameLower.includes(sig)) {
      nameStrong.push(sig);
    } else if (topicsLower.includes(sig)) {
      topicStrong.push(sig);
    } else if (descLower.includes(sig)) {
      descStrong.push(sig);
    }
  }

  // --- Core and bonus keywords (flat match across all text, dedup vs strong) ---
  const alreadyMatched = new Set([...nameStrong, ...topicStrong, ...descStrong]);
  const coreMatched: string[] = [];
  const bonusMatched: string[] = [];

  for (const kw of rules.coreFeatureKeywords) {
    if (combined.includes(kw) && !alreadyMatched.has(kw)) coreMatched.push(kw);
  }
  for (const kw of rules.bonusKeywords) {
    if (combined.includes(kw) && !alreadyMatched.has(kw) && !coreMatched.includes(kw)) {
      bonusMatched.push(kw);
    }
  }

  // --- Compute tiered score ---
  const nameScore = nameStrong.length * 14 + (nameStrong.length > 0 ? 8 : 0);
  const topicScore = topicStrong.length * 6;
  const descScore = descStrong.length * 3;
  const coreScore = coreMatched.length * 3;
  const bonusScore = bonusMatched.length * 2;

  let score: number;
  if (nameStrong.length > 0) {
    // Name-confirmed purpose: full 30-point ceiling.
    score = Math.min(30, nameScore + topicScore + descScore + coreScore + bonusScore);
  } else {
    // No name-level confirmation: cap at 20 regardless of topic/desc matches.
    score = Math.min(20, topicScore + descScore + coreScore + bonusScore);
  }

  // --- Negative signal penalty (-3 pts each, floor 0) ---
  // Only applied when there is no name-level strong signal: confirmed libraries
  // (tesseract.js, pdf-parse, pdf.js…) are completely immune.
  if (nameStrong.length === 0) {
    const negHits = rules.negativeSignals.filter(
      (sig) => nameLower.includes(sig) || combined.includes(sig)
    );
    score = Math.max(0, score - negHits.length * 3);
  }

  // --- Anti-pattern cap ---
  // Repos that are clearly the wrong *type* (MCP server…) get capped at 8
  // so they can't crowd out real libraries via keyword overlap alone.
  const antiPatternHit = rules.antiPatterns.some(
    (pat) => nameLower.includes(pat) || combined.includes(pat)
  );
  if (antiPatternHit) {
    score = Math.min(score, 8);
  }

  const matched = [
    ...nameStrong,
    ...topicStrong,
    ...descStrong,
    ...coreMatched,
  ].slice(0, 5);

  return { score, matched, antiPatternHit };
}

// Score stack match. Returns 0–20.
export function scoreStackMatch(
  language: string | undefined,
  keywords: string[],
  rules: CategoryRule
): { score: number; reason: string } {
  const lang = (language ?? "").toLowerCase();
  const kwText = keywords.join(" ").toLowerCase();

  if (lang === "typescript") {
    return { score: 20, reason: "TypeScript native" };
  }
  if (lang === "javascript") {
    // Check for TypeScript types in keywords
    if (kwText.includes("typescript") || kwText.includes("@types")) {
      return { score: 18, reason: "JavaScript with TypeScript support" };
    }
    return { score: 15, reason: "JavaScript (usable from TypeScript)" };
  }
  // Check if stack keywords appear in description/keywords
  const stackHits = rules.stackKeywords.filter((kw) =>
    kwText.includes(kw)
  );
  if (stackHits.length >= 2) {
    return { score: 12, reason: `Stack keywords: ${stackHits.slice(0, 2).join(", ")}` };
  }
  if (stackHits.length === 1) {
    return { score: 7, reason: `Stack keyword: ${stackHits[0]}` };
  }
  return { score: 3, reason: "Unknown stack compatibility" };
}

// Score maintenance signal. Returns 0–20.
export function scoreMaintenance(
  lastUpdated: string | undefined,
  archived: boolean | undefined
): { score: number; reason: string } {
  if (archived) {
    return { score: 0, reason: "Archived — no longer maintained" };
  }
  if (!lastUpdated) {
    return { score: 5, reason: "Unknown last update" };
  }

  const updatedAt = new Date(lastUpdated);
  const now = new Date();
  const monthsAgo = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo < 3) return { score: 20, reason: "Updated < 3 months ago" };
  if (monthsAgo < 6) return { score: 18, reason: "Updated < 6 months ago" };
  if (monthsAgo < 12) return { score: 15, reason: "Updated < 1 year ago" };
  if (monthsAgo < 24) return { score: 10, reason: "Updated < 2 years ago" };
  return { score: 4, reason: `Updated ${Math.round(monthsAgo / 12)} years ago` };
}

// Score popularity. Returns 0–15.
export function scorePopularity(
  stars: number | undefined,
  downloads: number | undefined
): { score: number; reason: string } {
  // Use whichever signal is stronger.
  let starScore = 0;
  let dlScore = 0;

  if (stars !== undefined && stars > 0) {
    // log10 scale: 10k stars → ~12, 1k → ~9, 100 → ~6
    starScore = Math.min(15, Math.round(Math.log10(stars + 1) * 3.5));
  }
  if (downloads !== undefined && downloads > 0) {
    // 1M/month → ~13, 100k → ~10, 10k → ~7
    dlScore = Math.min(15, Math.round(Math.log10(downloads + 1) * 3));
  }

  const score = Math.max(starScore, dlScore);
  const parts: string[] = [];
  if (stars) parts.push(`${formatNum(stars)} stars`);
  if (downloads) parts.push(`~${formatNum(downloads)}/mo downloads`);

  return {
    score,
    reason: parts.length ? parts.join(", ") : "No popularity data",
  };
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
