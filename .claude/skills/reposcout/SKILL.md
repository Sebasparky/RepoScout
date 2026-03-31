---
name: reposcout
description: Check for OSS reuse before implementing substantial product features. TRIGGER when: adding auth, charts, editors, uploads, PDF preview, data grids, payments, notifications, or other reusable UI/infrastructure features. DO NOT TRIGGER when: fixing styles, debugging, refactoring, or implementing custom business logic. Returns JSON with surface_oss, continue_direct, or skip_oss.
metadata:
  tags: oss, reuse, build-vs-borrow, libraries, preflight
---

# RepoScout — Build vs Borrow Preflight

## What this skill does

RepoScout runs a preflight check before you implement a substantial feature.
It analyses the task, inspects the current repo's stack, searches GitHub and npm
for well-matched OSS libraries, and returns a machine-readable decision.

**Use it to answer: "Should I reach for an existing library, or build this myself?"**

Default behavior is silence. Only interrupt the user when decision.action == "surface_oss".

---

## Local setup

> See README.md for local build and token setup.

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
```

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
      "githubUrl": "https://github.com/nextauthjs/next-auth",
      "npmUrl": "https://www.npmjs.com/package/next-auth",
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

### Null fields

`decision.confidence` is non-null **only** when `action == "surface_oss"`. It is `null` for `continue_direct` and `skip_oss`.

`topCandidates` is always an array. It is `[]` when `action` is `continue_direct` or `skip_oss`.

### Error response

On error the process exits non-zero and writes to **stderr**:

```json
{"error": "<message>"}
```

All structured output on success goes to **stdout** only.

---

## Response templates

Use these fixed patterns. Do not paraphrase.

**`surface_oss`**

```
Before writing this from scratch — {topCandidates[0].name} looks like a strong fit.
{why[0]}. License: {license}, {stars} stars.
→ GitHub: {githubUrl}  npm: {npmUrl}
Want to use this, compare options, or build custom?
```

Show top 1–3 candidates. Include name, githubUrl, npmUrl, license, stars, and the first 1–2 why reasons per candidate.

**`continue_direct`** — Silent. Proceed with implementation immediately.

**`skip_oss` when `alreadyHave` is non-null** — Say once: "You already have {alreadyHave} — check its docs before adding another." Then proceed.

**`skip_oss` when `alreadyHave` is null** — Silent. Proceed with implementation immediately.

---

## Architecture note

This skill is a thin JSON adapter over the RepoScout TypeScript engine located in
this repository (`src/pipeline/runRepoScout.ts`). It does not duplicate the engine —
`skillEntry.ts` calls `runRepoScout()` directly and maps the result to the output
contract above. All ranking, confidence gating, and repo inspection logic lives in
the existing codebase.

GitHub search runs directly from the local RepoScout process (`src/search/github.ts`).
Results are cached in-process with a 5-minute TTL to avoid redundant API calls.
If `GITHUB_TOKEN` is set, it is used for authenticated requests; otherwise
unauthenticated requests are made. No backend server or OAuth app is involved.
