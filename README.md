# RepoScout

**RepoScout** is a Claude skill that runs a **build-vs-borrow preflight** before implementation.

Instead of immediately generating code for every feature request, RepoScout checks whether the feature is better served by a proven open-source library. It inspects the request, looks at the repo context, searches for relevant OSS, ranks candidates, and only interrupts when confidence is high. If no strong match exists, it stays out of the way and lets implementation continue normally.

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
├── SKILL.md
└── scripts/
    └── run_reposcout.sh

repo_source/
├── src/
├── dist/
└── ...
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

## Future improvements

- stronger signal matching for more natural UI phrasing
- better subtype awareness for related domains like OCR vs PDF preview
- tighter repo-aware ranking
- smoother handoff from recommendation into implementation

---

## License

Add your preferred license here.
