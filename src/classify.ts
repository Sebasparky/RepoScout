import { Category, ClassificationResult } from "./types.js";

type CategorySignal = {
  category: Category;
  keywords: string[];
};

// Ordered by specificity — first match wins.
const SIGNALS: CategorySignal[] = [
  {
    category: "document_parsing",
    keywords: [
      "pdf", "ocr", "document", "parse", "parser", "parsing",
      "extract", "extraction", "text recognition", "optical character",
      "tesseract", "pdfjs", "docx", "word document", "invoice",
      "receipt", "scanned", "image to text",
    ],
  },
];

// Categories that benefit from OSS search.
const OSS_ELIGIBLE: Category[] = ["document_parsing"];

export function classify(task: string): ClassificationResult {
  const lower = task.toLowerCase();

  for (const signal of SIGNALS) {
    const matched = signal.keywords.filter((kw) => lower.includes(kw));
    if (matched.length > 0) {
      return {
        category: signal.category,
        shouldSearchOss: OSS_ELIGIBLE.includes(signal.category),
        reason: `Matched ${signal.category} indicators: ${matched.slice(0, 3).join(", ")}`,
      };
    }
  }

  return {
    category: "unknown",
    shouldSearchOss: false,
    reason: "No recognized category indicators found — OSS search skipped",
  };
}
