import { RequestAnalysis, TaskType } from "./types.js";

// ── Signal tables ─────────────────────────────────────────────────────────────
// Each entry maps a primary keyword to a task type. Order matters: more
// specific strings should come before generic ones within each group.

type SignalEntry = { signal: string; type: TaskType; confidence: "high" | "medium" };

const SIGNALS: SignalEntry[] = [
  // ── config / styling — detect first, these are almost never OSS problems
  { signal: "fix spacing",       type: "config_change", confidence: "high" },
  { signal: "fix padding",       type: "config_change", confidence: "high" },
  { signal: "fix margin",        type: "config_change", confidence: "high" },
  { signal: "fix styling",       type: "config_change", confidence: "high" },
  { signal: "fix the button",    type: "config_change", confidence: "high" },
  { signal: "fix this button",   type: "config_change", confidence: "high" },
  { signal: "button spacing",    type: "config_change", confidence: "high" },
  { signal: "button padding",    type: "config_change", confidence: "high" },
  { signal: "color change",      type: "config_change", confidence: "high" },
  { signal: "rename",            type: "config_change", confidence: "medium" },
  { signal: "refactor",          type: "config_change", confidence: "medium" },
  { signal: "formatting",        type: "config_change", confidence: "medium" },

  // ── common infrastructure — always worth searching OSS
  { signal: "authentication",    type: "common_infra",  confidence: "high" },
  { signal: "authorisation",     type: "common_infra",  confidence: "high" },
  { signal: "authorization",     type: "common_infra",  confidence: "high" },
  { signal: "add auth",          type: "common_infra",  confidence: "high" },
  { signal: "oauth",             type: "common_infra",  confidence: "high" },
  { signal: "sso",               type: "common_infra",  confidence: "high" },
  { signal: "login",             type: "common_infra",  confidence: "medium" },
  { signal: "sign in",           type: "common_infra",  confidence: "medium" },
  { signal: "sign up",           type: "common_infra",  confidence: "medium" },
  { signal: "signup",            type: "common_infra",  confidence: "medium" },
  { signal: "jwt",               type: "common_infra",  confidence: "high" },
  { signal: "session",           type: "common_infra",  confidence: "medium" },
  { signal: "payment",           type: "common_infra",  confidence: "high" },
  { signal: "stripe",            type: "common_infra",  confidence: "high" },
  { signal: "billing",           type: "common_infra",  confidence: "high" },
  { signal: "checkout",          type: "common_infra",  confidence: "high" },
  { signal: "send email",        type: "common_infra",  confidence: "high" },
  { signal: "email sending",     type: "common_infra",  confidence: "high" },
  { signal: "smtp",              type: "common_infra",  confidence: "high" },
  { signal: "file upload",       type: "common_infra",  confidence: "high" },
  { signal: "s3 upload",         type: "common_infra",  confidence: "high" },
  { signal: "analytics",         type: "common_infra",  confidence: "high" },
  { signal: "monitoring",        type: "common_infra",  confidence: "high" },
  { signal: "push notification", type: "common_infra",  confidence: "high" },

  // ── UI components — almost always OSS
  { signal: "rich text editor",  type: "ui_component",  confidence: "high" },
  { signal: "wysiwyg",           type: "ui_component",  confidence: "high" },
  { signal: "rich text",         type: "ui_component",  confidence: "high" },
  { signal: "text editor",       type: "ui_component",  confidence: "high" },
  { signal: "date picker",       type: "ui_component",  confidence: "high" },
  { signal: "datepicker",        type: "ui_component",  confidence: "high" },
  { signal: "calendar picker",   type: "ui_component",  confidence: "high" },
  { signal: "data table",        type: "ui_component",  confidence: "high" },
  { signal: "data grid",         type: "ui_component",  confidence: "high" },
  { signal: "chart component",   type: "ui_component",  confidence: "high" },
  { signal: "chart library",     type: "ui_component",  confidence: "high" },
  { signal: "drag and drop",     type: "ui_component",  confidence: "high" },
  { signal: "color picker",      type: "ui_component",  confidence: "high" },
  { signal: "file dropzone",     type: "ui_component",  confidence: "high" },
  { signal: "virtual scroll",    type: "ui_component",  confidence: "high" },
  { signal: "infinite scroll",   type: "ui_component",  confidence: "high" },
  { signal: "toast notification",type: "ui_component",  confidence: "high" },
  { signal: "tooltip",           type: "ui_component",  confidence: "medium" },
  { signal: "combobox",          type: "ui_component",  confidence: "high" },
  { signal: "autocomplete",      type: "ui_component",  confidence: "high" },

  // ── data processing — usually OSS, overlaps with document_parsing category
  { signal: "ocr",               type: "data_processing", confidence: "high" },
  { signal: "pdf parse",         type: "data_processing", confidence: "high" },
  { signal: "pdf parser",        type: "data_processing", confidence: "high" },
  { signal: "pdf extract",       type: "data_processing", confidence: "high" },
  { signal: "document parser",   type: "data_processing", confidence: "high" },
  { signal: "image processing",  type: "data_processing", confidence: "high" },
  { signal: "csv parse",         type: "data_processing", confidence: "high" },
  { signal: "excel parse",       type: "data_processing", confidence: "high" },
  { signal: "markdown parser",   type: "data_processing", confidence: "high" },
  { signal: "syntax highlight",  type: "data_processing", confidence: "high" },

  // ── business logic — custom, not worth searching OSS generically
  { signal: "our business",      type: "business_logic", confidence: "high" },
  { signal: "our logic",         type: "business_logic", confidence: "high" },
  { signal: "custom algorithm",  type: "business_logic", confidence: "high" },
  { signal: "domain logic",      type: "business_logic", confidence: "high" },
];

const OSS_TASK_TYPES: TaskType[] = [
  "common_infra",
  "ui_component",
  "data_processing",
];

const STOP_WORDS = new Set([
  "add", "fix", "the", "my", "our", "a", "an", "to", "for",
  "in", "up", "get", "set", "use", "need", "i", "we", "and",
  "with", "from", "into", "this", "that", "send", "make",
]);

// Extract content words from a matched signal phrase for request-driven scoring.
// Always includes the full phrase; also includes individual words that are
// content-bearing (not stop words, length >= 4).
function extractFeatureTerms(signal: string): string[] {
  const terms: string[] = [signal];
  for (const word of signal.split(/\s+/)) {
    if (word.length >= 4 && !STOP_WORDS.has(word)) {
      terms.push(word);
    }
  }
  return terms;
}

export function analyzeRequest(task: string): RequestAnalysis {
  const lower = task.toLowerCase();

  // Find the first (highest-priority) matching signal.
  const match = SIGNALS.find((s) => lower.includes(s.signal));

  if (!match) {
    return {
      taskType: "unknown",
      intent: task.slice(0, 80),
      primarySignal: "",
      featureTerms: [],
      likelySolvableByOss: false,
      confidence: "low",
    };
  }

  return {
    taskType: match.type,
    intent: buildIntent(match.type, match.signal),
    primarySignal: match.signal,
    featureTerms: extractFeatureTerms(match.signal),
    likelySolvableByOss: OSS_TASK_TYPES.includes(match.type),
    confidence: match.confidence,
  };
}

const TYPE_LABEL: Record<TaskType, string> = {
  common_infra:    "Infrastructure",
  ui_component:    "UI component",
  data_processing: "Data processing",
  config_change:   "Local config change",
  business_logic:  "Custom business logic",
  unknown:         "General task",
};

function buildIntent(type: TaskType, signal: string): string {
  return `${TYPE_LABEL[type]}: ${signal}`;
}
