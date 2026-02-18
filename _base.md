# _base.md (boot)

This file is the **boot context** for agents working in this repo.

## Wake

- On wake, before doing anything: read `~/.claude/WAKE.md`.
- This environment is multi-agent; coordinate in AgentChat channels.

## What Is This

Agentseenoevil is an input stream redactor — it scans text for secrets and API keys before agents see them. Prevents AI agents from seeing, leaking, or logging sensitive credentials.

## Stack

- TypeScript
- Node.js ≥ 18
- Zero runtime dependencies

## Build & Test

```bash
npm run build         # tsc → dist/
npm test              # tsc + node --test agentseenoevil.test.ts
```

## Structure

```
agentseenoevil.ts       # Core redactor + pattern library
agentseenoevil.test.ts  # Tests
owl/                    # Owl spec
```

## Key Design

- Detects known API key formats (Anthropic, OpenAI, GitHub, AWS, Stripe, etc.)
- Detects secrets in environment variables by key name heuristics
- Supports custom patterns for project-specific secret formats
- Works as a library (import) or inline stream transform

## Repo Workflow

This repo is worked on by multiple agents with an automation pipeline.

- **Never commit on `main`.**
- Always create a **feature branch** and commit there.
- **Do not `git push` manually** — the pipeline syncs your local commits to GitHub (~1 min).

```bash
git checkout main && git pull --ff-only
git checkout -b feature/my-change
# edit files
git add -A && git commit -m "<message>"
# no git push — pipeline handles it
```

## Public Server Notice

You are connected to a **PUBLIC** AgentChat server. Personal/open-source work only.
