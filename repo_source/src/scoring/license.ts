// License safety scoring — max 15 points.
// Permissive licenses score highest; strong copyleft scores lowest.

const LICENSE_SCORES: Record<string, number> = {
  // Fully permissive
  MIT: 15,
  "Apache-2.0": 15,
  "BSD-2-Clause": 15,
  "BSD-3-Clause": 15,
  ISC: 15,
  Unlicense: 15,
  "0BSD": 15,
  "CC0-1.0": 14,
  // Weak copyleft — library use is generally fine
  "LGPL-2.0": 10,
  "LGPL-2.1": 10,
  "LGPL-3.0": 10,
  "LGPL-2.0-only": 10,
  "LGPL-2.1-only": 10,
  "LGPL-3.0-only": 10,
  "MPL-2.0": 11,
  "EUPL-1.2": 9,
  // Strong copyleft — requires source disclosure of derived work
  "GPL-2.0": 4,
  "GPL-3.0": 4,
  "GPL-2.0-only": 4,
  "GPL-3.0-only": 4,
  "AGPL-3.0": 2,
  "AGPL-3.0-only": 2,
};

export function scoreLicense(license: string | undefined): {
  score: number;
  label: string;
} {
  if (!license || license === "NOASSERTION") {
    return { score: 5, label: "Unknown (use with caution)" };
  }
  const score = LICENSE_SCORES[license];
  if (score !== undefined) {
    return { score, label: license };
  }
  // Unknown SPDX — treat as cautionary
  return { score: 5, label: `${license} (unrecognized)` };
}
