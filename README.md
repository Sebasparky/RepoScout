# RepoScout

**RepoScout** is a local Claude skill that runs a **build-vs-borrow preflight** before implementation.

Instead of immediately generating code for every feature request, RepoScout checks whether the feature is better served by a proven open-source library. It inspects the request, looks at the repo context, searches for relevant OSS, ranks candidates, and only interrupts when confidence is high. If no strong match exists, it stays out of the way and lets implementation continue normally.

RepoScout runs entirely on your machine as a single process — no backend server, no OAuth app. Set `GITHUB_TOKEN` for better rate limits; leave it unset and it still works.

---

## Setup

### 1. Install and build

```bash
# From the repo root
npm install
npm run build
```

### 2. (Optional) Set a GitHub token

RepoScout works without any token using GitHub's unauthenticated API. For better authenticated access and more reliable rate limits, add a personal access token:

```bash
export GITHUB_TOKEN=your_token_here
```

No scopes are required — public repo search is available without any permissions.

To create a token: [github.com/settings/tokens](https://github.com/settings/tokens) → Fine-grained tokens → New token → no scopes needed.

### 3. Use the skill

In your Claude Code session:

```text
/reposcout Add a data grid with sorting and filtering
```

That's it. No backend startup, no OAuth app, no extra environment variables required.

---

## Why we built it

While building our trucking verification app, we kept running into feature requests that were likely better solved by existing OSS than by fresh code generation. Claude was good at writing code, but we wanted better judgment about **when to build** and **when to borrow**.

RepoScout turns Claude from a code generator into a smarter implementation partner.

---

## What it does

RepoScout:

- analyzes the feature request
- inspects repo context like framework, language, and dependencies
- searches OSS candidates
- ranks them by relevance, stack fit, maintenance, popularity, and license safety
- only surfaces results when the match is strong
- skips custom business logic and small local edits

### Good RepoScout cases

- auth
- PDF/document preview
- OCR/document parsing
- rich text editors
- charts / KPI visualizations
- data grids / sortable tables
- uploads and other reusable UI/infrastructure features

### Bad RepoScout cases

- internal approval workflows
- domain-specific business logic
- tiny UI tweaks
- small refactors or one-off local fixes

---

## How it works

RepoScout runs in three steps:

1. **Analyze the request**  
   Understand whether the task looks like a reusable OSS problem or custom logic.

2. **Inspect repo context**  
   Detect framework, language, package manager, and existing dependencies.

3. **Search and decide**  
   Search OSS, rank candidates, and return one of:
   - `surface_oss`
   - `continue_direct`
   - `skip_oss`

---

## Example behavior

### Strong OSS match

**Prompt**

~~~text
/reposcout Add an in-app PDF/document preview panel for verification documents.
~~~

RepoScout can refine toward libraries like:

- `react-pdf`
- `pdfjs-dist`

### Another strong match

**Prompt**

~~~text
/reposcout Add a small data visualization / chart component for DOT safety metrics.
~~~

RepoScout can surface:

- `recharts`

### Correct skip

**Prompt**

~~~text
/reposcout Add an internal manual review workflow for flagged DOT verification cases, including our own approval states and reviewer notes.
~~~

RepoScout should skip OSS and continue directly, because that is custom business logic.

---

## Skill behavior

RepoScout is designed to be low-noise.

- If there is a strong match, it surfaces the best OSS path before coding starts.
- If the match is weak, it stays silent.
- If the task is custom internal logic, it skips OSS entirely.

That means the user only sees RepoScout when it is actually useful.

---

## Project structure

~~~text
.claude/skills/reposcout/
├── SKILL.md                  ← skill instructions for Claude
└── scripts/
    └── run_reposcout.sh      ← invoked by the skill

src/
├── search/
│   └── github.ts             ← local GitHub search + in-process cache
├── pipeline/runRepoScout.ts  ← core engine
├── skillEntry.ts             ← skill entrypoint (JSON output)
└── cli.ts                    ← interactive CLI entrypoint

.env.example                  ← env var reference (GITHUB_TOKEN only)
~~~

---

## Usage

### In Claude Code

Use it directly:

~~~text
/reposcout Add a data grid with sorting and filtering for DOT verification results.
~~~

Or let it auto-trigger when the request clearly looks like a reusable feature.

### Dry run

To test without writing code:

~~~text
/reposcout Add a small data visualization / chart component for DOT safety metrics.

Do not write or modify any code. This is a dry run of the skill only. Show me what RepoScout would do.
~~~

### CLI (without Claude)

You can also run RepoScout directly as a CLI tool:

~~~bash
# Interactive
npm run dev -- "Add a date picker component"

# JSON output (same as skill)
node dist/skillEntry.js --task "Add a date picker component"
~~~

---

## Why this matters

RepoScout helps developers:

- avoid reinventing common features
- reduce wasted token usage
- discover better OSS options earlier
- make stronger implementation decisions before coding starts

**Build less. Reuse better.**

---

## Demo highlights

RepoScout was validated against real feature prompts from our trucking verification app, including:

- PDF preview panels
- data grids
- KPI / chart components
- custom internal workflows

This showed that Claude can do more than generate code — it can help decide the right implementation path first.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | no | Personal access token — enables authenticated GitHub access and more reliable rate limits. No scopes required. |

---

## Future improvements

- stronger signal matching for more natural UI phrasing
- better subtype awareness for related domains like OCR vs PDF preview
- tighter repo-aware ranking
- smoother handoff from recommendation into implementation

---

## License

Add your preferred license here.
