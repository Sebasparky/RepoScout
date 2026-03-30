# RepoScout

**RepoScout** is a local Claude skill that runs a **build-vs-borrow preflight** before implementation.

Instead of immediately generating code for every feature request, RepoScout checks whether the feature is better served by a proven open-source library. It inspects the request, looks at the repo context, searches for relevant OSS, ranks candidates, and only interrupts when confidence is high. If no strong match exists, it stays out of the way and lets implementation continue normally.

RepoScout runs entirely on your machine. You provide your own GitHub OAuth app credentials, run the backend locally, and point your Claude skill at your local backend URL. There is no shared hosted service.

---

## Setup

### 1. Install and build

```bash
# From the repo root
npm install
npm run build
```

### 2. Create a GitHub OAuth app

RepoScout routes GitHub search through a local backend using your own GitHub OAuth App credentials. This gives you 5,000 requests/hour instead of GitHub's unauthenticated limit of 60/hour.

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Fill in any name (e.g. `RepoScout Local`), homepage URL, and callback URL (can be `http://localhost`)
3. Copy the **Client ID** and generate a **Client Secret**

### 3. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Or export them directly in your shell:

```bash
# Backend (server-side only)
export GITHUB_CLIENT_ID=your_client_id
export GITHUB_CLIENT_SECRET=your_client_secret

# Skill/client (points to your local backend)
export REPOSCOUT_BACKEND_URL=http://localhost:3001
```

### 4. Run the local backend

```bash
npm run server
```

The backend starts on port 3001 by default. You should see:

```
[reposcout-backend] listening on port 3001
```

Keep this running while you use the skill.

### 5. Wire up the Claude skill

In your Claude Code session, the skill is invoked via:

```text
/reposcout Add a data grid with sorting and filtering
```

The skill calls `run_reposcout.sh`, which builds and runs the engine against your local backend. Make sure `REPOSCOUT_BACKEND_URL` is set in the environment where Claude Code runs.

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
├── server/
│   ├── index.ts              ← local backend server (GitHub proxy)
│   └── githubProxy.ts        ← GitHub search + caching
├── pipeline/runRepoScout.ts  ← core engine
├── skillEntry.ts             ← skill entrypoint (JSON output)
└── cli.ts                    ← interactive CLI entrypoint

.env.example                  ← env var reference
~~~

---

## Usage

### Prerequisites

Before invoking the skill, make sure:
- The local backend is running (`npm run start:server`)
- `REPOSCOUT_BACKEND_URL=http://localhost:3001` is set in your environment

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

| Variable | Where used | Required | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | server only | for 5k req/hr | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | server only | for 5k req/hr | GitHub OAuth App client secret |
| `REPOSCOUT_BACKEND_URL` | client/skill | yes (recommended) | URL of your local backend (e.g. `http://localhost:3001`) |
| `PORT` | server only | no | Backend port, defaults to `3001` |
| `GITHUB_TOKEN` | client only | no | Personal access token for direct GitHub fallback (used when `REPOSCOUT_BACKEND_URL` is not set) |
| `REPOSCOUT_TRUST_PROXY` | server only | no | Set to `true` if running behind a trusted reverse proxy that sets `X-Forwarded-For` |

---

## Future improvements

- stronger signal matching for more natural UI phrasing
- better subtype awareness for related domains like OCR vs PDF preview
- tighter repo-aware ranking
- smoother handoff from recommendation into implementation

---

## License

Add your preferred license here.
