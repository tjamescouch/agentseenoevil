# agentseenoevil — Input stream redactor for AI agents

## What It Does

Scans text streams for API keys, tokens, and secrets before they reach AI agents. Three detection layers:

1. **Built-in patterns** — Known formats (Anthropic, OpenAI, GitHub, AWS, Stripe, etc.)
2. **Custom patterns** — User-defined regex for internal secret formats
3. **Environment scan** — Automatic detection of secrets loaded in `process.env`

Replaces detected secrets with a configurable token (default: `***REDACTED***`).

## Why It Exists

Agents read untrusted input: files, HTTP responses, user-submitted text. If a secret accidentally appears in that input, it should be redacted before:

- The agent logs it
- The agent stores it in memory
- The agent sends it to a third-party API
- The agent includes it in training data

This is **defense in depth** — catches obvious leaks before they propagate.

## How It Works

```javascript
import { Redactor } from 'agentseenoevil';

const redactor = new Redactor({ useBuiltinPatterns: true, scanEnv: true });
const result = redactor.redact('My API key is sk-ant-v0-abc123...');

// result.cleaned: 'My API key is ***REDACTED***'
// result.redactionCount: 1
// result.detections: [{ pattern: 'anthropic-key', match: 'sk-ant-v0-abc123...', position: 14 }]
```

The redactor compiles all patterns once at creation, then scans input text in O(n) time.

## Detection Layers

### Layer 1: Built-in Patterns

Recognizes common API key formats:
- **Anthropic** — `sk-ant-v0-*`
- **OpenAI** — `sk-*`
- **GitHub** — `ghp_*`, `github_pat_*`
- **AWS** — Access keys, secret keys, session tokens
- **Stripe** — `sk_live_*`, `pk_*`
- **Generic** — Bearer tokens, JWTs

### Layer 2: Custom Patterns

Define regex for internal secrets:

```javascript
const redactor = new Redactor({
  customPatterns: [
    { name: 'internal-token', pattern: /internal_[A-F0-9]{32}/gi }
  ]
});
```

### Layer 3: Environment Scanning

Scans `process.env` for values that match known secret patterns. Catches secrets loaded into the environment without explicit configuration.

## API

### `new Redactor(options)`

Create a redactor instance.

**Options:**
- `useBuiltinPatterns` (boolean, default: true) — Enable built-in secret patterns
- `customPatterns` (Pattern[], default: []) — Custom regex patterns
- `scanEnv` (boolean, default: true) — Scan process.env for secrets
- `replacementToken` (string, default: '***REDACTED***') — Replacement text

### `redactor.redact(input: string): RedactResult`

Scan and redact secrets from input.

**Returns:**
```typescript
{
  cleaned: string;           // Redacted text
  redactionCount: number;    // How many secrets were found
  detections: Detection[];   // Details of each match
}
```

**Detection:**
```typescript
{
  pattern: string;   // Pattern name that matched
  match: string;     // The matched secret (partial if very long)
  position: number;  // Index in original text
  length: number;    // Match length
}
```

## Performance

- **O(n)** scanning where n = input length
- Patterns compiled once at creation
- Safe for streaming input (scan each chunk)

## Security Notes

- This is **defense in depth** — not foolproof
- Redacted output may still contain partial information
- Highly sensitive workflows should use additional measures (sandboxing, air-gapping)
- The redaction token itself is visible in output

## Use Cases

- Pre-process files before agent reads them
- Filter HTTP responses before agent parsing
- Clean logs before storage
- Sanitize user-submitted text before agent processing
- Protect clipboard/paste operations in agent UIs

## Installation

```bash
npm install agentseenoevil
```

## Example: Redact Files

```javascript
import { Redactor } from 'agentseenoevil';
import fs from 'fs';

const redactor = new Redactor();
const fileContent = fs.readFileSync('./config.json', 'utf8');
const cleaned = redactor.redact(fileContent);

if (cleaned.redactionCount > 0) {
  console.warn(`Found ${cleaned.redactionCount} secrets in config.json`);
  cleaned.detections.forEach(d => {
    console.warn(`  - ${d.pattern} at position ${d.position}`);
  });
}

// Safe to pass to agent
agent.processFile(cleaned.cleaned);
```

## Example: Streaming Redaction

```javascript
const redactor = new Redactor();
let buffer = '';

process.stdin.on('data', chunk => {
  buffer += chunk.toString();
  const result = redactor.redact(buffer);
  process.stdout.write(result.cleaned);
  buffer = ''; // Clear buffer after redaction
});
```

## License

MIT
