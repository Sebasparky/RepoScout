import { Candidate } from "../types.js";

const BASE = "https://registry.npmjs.org/-/v1/search";
const PER_QUERY = 5;

type NpmPackage = {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  date: string;
  links: {
    npm: string;
    homepage?: string;
    repository?: string;
  };
};

type NpmSearchObject = {
  package: NpmPackage;
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
};

type NpmSearchResponse = {
  objects: NpmSearchObject[];
};

async function searchOnce(query: string): Promise<Candidate[]> {
  const url = `${BASE}?text=${encodeURIComponent(query)}&size=${PER_QUERY}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "reposcout-cli/0.1" },
  });

  if (!res.ok) {
    console.error(`  [npm] error ${res.status} for query: "${query}"`);
    return [];
  }

  const data = (await res.json()) as NpmSearchResponse;
  return (data.objects ?? []).map(objectToCandidate);
}

// npm popularity score (0–1) mapped to an estimated monthly download figure
// for display purposes only — not used in scoring directly.
function estimateMonthlyDownloads(popularity: number): number {
  return Math.round(popularity * 5_000_000);
}

function objectToCandidate(obj: NpmSearchObject): Candidate {
  const pkg = obj.package;
  return {
    id: `npm:${pkg.name}`,
    source: "npm",
    name: pkg.name,
    url: pkg.links.npm,
    description: pkg.description,
    language: "JavaScript", // npm is always JS/TS ecosystem
    keywords: pkg.keywords,
    lastUpdated: pkg.date,
    downloads: estimateMonthlyDownloads(obj.score.detail.popularity),
    rawMetadata: obj as unknown as Record<string, unknown>,
  };
}

export async function searchNpm(queries: string[]): Promise<Candidate[]> {
  const results = await Promise.all(queries.map(searchOnce));
  return dedup(results.flat());
}

function dedup(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
