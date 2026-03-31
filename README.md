# RepoScout

RepoScout is a local Claude skill that runs a build-vs-borrow preflight before implementation.

It checks the request, inspects repo context, searches OSS, and only interrupts when a strong match exists. If the task is custom, it gets out of the way.

## Setup

```bash
npx reposcout init
```

Optional for better GitHub access and more reliable rate limits:

```bash
export GITHUB_TOKEN=your_token_here
```

Use in Claude Code:

```text
/reposcout Add a data grid with sorting and filtering
```

No backend. No OAuth app. Fully local.

## What RepoScout does

- analyzes the feature request
- inspects repo context like framework, language, and dependencies
- searches OSS candidates
- ranks them by relevance, stack fit, maintenance, popularity, and license safety
- only surfaces results when the match is strong
- skips custom business logic and small local edits

## Example behavior

### Strong OSS match

Prompt:

```text
/reposcout Add a small data visualization or chart component for KPI metrics
```

RepoScout can surface:

- `recharts`
- `chart.js`

### Correct skip

Prompt:

```text
/reposcout Add an internal manual review workflow for flagged verification cases, including our own approval states and reviewer notes
```

RepoScout should skip OSS and continue directly because that is custom business logic.

## CLI

You can also run RepoScout directly without Claude Code:

```bash
npm run dev -- "Add a date picker component"
node dist/skillEntry.js --task "Add a date picker component"
```

## Environment variables

| Variable       | Required | Description |
|----------------|----------|-------------|
| `GITHUB_TOKEN` | No       | Personal access token for better authenticated GitHub access and more reliable rate limits |

## License

MIT
