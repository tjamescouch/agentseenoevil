# agentseenoevil

input stream redactor — scans text for secrets and API keys before agents see them.

## purpose

- prevent AI agents from seeing, leaking, or logging sensitive credentials
- detect known API key formats (Anthropic, OpenAI, GitHub, AWS, Stripe, etc.)
- detect secrets in environment variables by key name heuristics
- support custom patterns for project-specific secret formats
- work as a library (import) or inline stream transform

## components

- [redactor](components.md#redactor) — core redaction engine with pattern + env scanning
- [patterns](components.md#patterns) — built-in regex library for known key formats

## constraints

see [constraints.md](constraints.md)
