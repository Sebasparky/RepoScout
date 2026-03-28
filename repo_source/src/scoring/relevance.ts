// Request-driven relevance scoring.
//
// Used when no CategoryRule exists for the current query. Scores a candidate
// against featureTerms extracted directly from the user's request (e.g. ["auth"]
// for "add auth to my Next.js app"), using the same name/topic/desc tiers as
// scoreFeatureMatch so scores are comparable across paths.
//
// Returns the same shape as scoreFeatureMatch so callers need no branching.
export function scoreRelevance(
  shortName: string,
  description: string,
  keywords: string[],
  featureTerms: string[]
): { score: number; matched: string[]; antiPatternHit: false } {
  if (featureTerms.length === 0) {
    return { score: 0, matched: [], antiPatternHit: false };
  }

  // Normalize hyphens → spaces so "rich-text" matches term "rich text".
  const nameLower = shortName.toLowerCase().replace(/-/g, " ");
  const descLower = description.toLowerCase().replace(/-/g, " ");
  const topicsLower = keywords.join(" ").toLowerCase().replace(/-/g, " ");

  const nameMatched: string[] = [];
  const topicMatched: string[] = [];
  const descMatched: string[] = [];

  for (const term of featureTerms) {
    const t = term.toLowerCase();
    if (nameLower.includes(t)) {
      nameMatched.push(term);
    } else if (topicsLower.includes(t)) {
      topicMatched.push(term);
    } else if (descLower.includes(t)) {
      descMatched.push(term);
    }
  }

  const nameScore = nameMatched.length * 14 + (nameMatched.length > 0 ? 8 : 0);
  const topicScore = topicMatched.length * 6;
  const descScore  = descMatched.length  * 3;

  let score: number;
  if (nameMatched.length > 0) {
    score = Math.min(30, nameScore + topicScore + descScore);
  } else {
    score = Math.min(20, topicScore + descScore);
  }

  const matched = [...nameMatched, ...topicMatched, ...descMatched].slice(0, 5);
  return { score, matched, antiPatternHit: false };
}
