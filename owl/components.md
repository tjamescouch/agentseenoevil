# components

## redactor

the core engine. takes text in, returns redacted text out.

### capabilities

- redact secrets from a string, returning cleaned text + match metadata
- detect whether text contains secrets without modifying it
- create a Node.js Transform stream for inline pipeline redaction
- label redactions with the pattern name that matched (opt-in)

### detection layers

three layers, applied in order:

1. **built-in patterns** — regex matching for known API key formats (on by default)
2. **custom patterns** — user-supplied `{name, regex}` entries
3. **env scanning** — literal matching of `process.env` values whose key names look secret-like (opt-in)

env values are sorted longest-first to avoid partial replacement collisions.

### interfaces

exposes:
- `Redactor` class with constructor options
- `redact(input) → { text, count, matched }` — full result
- `clean(input) → string` — just the cleaned text
- `hasSecrets(input) → boolean` — detection only
- `createStream() → Transform` — streaming redaction

depends on:
- `patterns` module for built-in regex patterns and env key heuristics

### invariants

- redaction is one-pass per layer; patterns do not interact across layers
- env scanning requires explicit opt-in (`scanEnv: true`)
- replacement string is configurable; default is `[REDACTED]`
- minimum env value length threshold prevents short values from being treated as secrets

---

## patterns

the regex library. exports known API key formats and env key name heuristics.

### state

- `BUILTIN_PATTERNS` — array of `{name, pattern}` for known key formats
- `SECRET_ENV_KEY_PATTERNS` — array of regexes matching env var names likely to hold secrets

### coverage

built-in patterns detect:
- Anthropic API keys (`sk-ant-*`)
- OpenAI API keys (`sk-*`)
- GitHub PATs and OAuth tokens (`ghp_*`, `github_pat_*`, `gho_*`)
- AWS access key IDs (`AKIA*`) and secret access keys (via keyword proximity)
- Slack tokens (`xox[bpaors]-*`)
- Stripe keys (`sk_live_*`, `sk_test_*`, `rk_live_*`, etc.)
- Google API keys (`AIza*`)
- JWT tokens (three-segment base64)
- Generic secrets near keywords (`api_key`, `secret`, `token`, `password`, etc.)

env key patterns match names ending in `_KEY`, `_TOKEN`, `_SECRET`, `_PASSWORD`, `_CREDENTIAL`, `_API_KEY`, or starting with `AUTH`.

### invariants

- patterns must not use the global flag (the redactor adds it internally)
- each pattern has a human-readable name for reporting
