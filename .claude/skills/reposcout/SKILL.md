# RepoScout — Build vs Borrow Preflight

## What this skill does

RepoScout runs a preflight check before you implement a substantial feature.
It analyses the task, inspects the current repo's stack, searches GitHub and npm
for well-matched OSS libraries, and returns a machine-readable decision.

**Use it to answer: "Should I reach for an existing library, or build this myself?"**

Default behavior is silence. Only interrupt the user when decision.action == "surface_oss".

---

## When to invoke

Run RepoScout **before starting implementation** whenever the task looks like:

- Adding infrastructure that commonly has a library (auth, payments, email, file storage, rich text, charts, date pickers, analytics, notifications, …)
- Adding a UI component that could be sourced from an OSS library
- Adding data processing that commonly has a library (PDF parsing, OCR, CSV, image transforms, …)

**Do not invoke** for:

- Styling tweaks, spacing fixes, colour changes (config_change)
- Business logic or domain-specific workflows unique to this repo
- Debugging or refactoring existing code
- Tasks that clearly have no OSS equivalent

When the request looks like a reusable capability or common feature, invoke. For small edits, local fixes, refactors, and clearly custom workflows, do not invoke.

---

## How to invoke

Run:

```bash
!`${CLAUDE_SKILL_DIR}/scripts/run_reposcout.sh "$ARGUMENTS"`

---

## Output contract

The skill returns a single JSON object to stdout. Stderr is reserved for errors.

```json
{
  "task": "add auth to my Next.js app",
  "requestAnalysis": {
    "taskType": "common_infra",
    "primarySignal": "add auth",
    "featureTerms": ["add auth", "auth"],
    "likelySolvableByOss": true
  },
  "repoContext": {
    "language": "typescript",
    "framework": "nextjs",
    "packageManager": "pnpm",
    "uiStack": ["react", "tailwind"],
    "authSignals": []
  },
  "decision": {
    "action": "surface_oss",
    "reason": "Infrastructure tasks are well-served by OSS libraries (queries tailored for nextjs)",
    "alreadyHave": null,
    "confidence": 0.91
  },
  "topCandidates": [
    {
      "name": "nextauthjs/next-auth",
      "url": "https://github.com/nextauthjs/next-auth",
      "score": 91,
      "license": "ISC",
      "stars": 24000,
      "why": ["Matches: auth", "TypeScript", "maintained within 6 months"]
    }
  ]
}
```

### Decision actions

| Action | Meaning | What to do |
|--------|---------|------------|
| `surface_oss` | Strong OSS match found (score ≥ 55, feature confidence ≥ 8) | Present `topCandidates[0]` to the user before writing code |
| `continue_direct` | Searched but no strong match found | Proceed with direct implementation silently |
| `skip_oss` | Task is not an OSS problem (config change, business logic, or repo already has a library for this) | Proceed with direct implementation silently |

### `alreadyHave`

When `alreadyHave` is non-null, the repo already has a dep that covers the request.
Tell the user to check that library's capabilities before adding another one.

---

## How to use the result

```
if decision.action == "surface_oss":
    Tell the user: "RepoScout found a strong match: <topCandidates[0].name> (score <score>/100)"
    Show the top 1-3 candidates with name, url, license, and why[]
    Ask: "I found a strong OSS match. Do you want me to use it, compare options, or continue with a custom implementation?"

if decision.action == "continue_direct":
    Say nothing — proceed with implementation

if decision.action == "skip_oss":
    If alreadyHave is set: mention it once
    Otherwise: say nothing — proceed with implementation
```

**Only surface results when confidence is high.** Do not show partial or noisy matches.

---

## Architecture note

This skill is a thin JSON adapter over the RepoScout TypeScript engine located in
this repository (`src/pipeline/runRepoScout.ts`). It does not duplicate the engine —
`skillEntry.ts` calls `runRepoScout()` directly and maps the result to the output
contract above. All ranking, confidence gating, and repo inspection logic lives in
the existing codebase.
