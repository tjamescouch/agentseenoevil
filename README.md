# agentseenoevil

**Input stream redactor — scans for secrets and API keys before agents process them.**

Three-layer detection catches API keys, tokens, and secrets in agent inputs before they're logged or exposed.

## Why

Agents read files, HTTP responses, and other untrusted input. If a secret accidentally gets included in that input, we want to redact it before the agent sees it — both for security (prevents the agent from accidentally leaking it) and for hygiene (keeps it out of logs, memory, training data).

## Usage

```javascript
import { Redactor } from 'agentseenoevil';

const redactor = new Redactor({
  // Built-in patterns enabled by default
  useBuiltinPatterns: true,
  
  // Custom patterns (optional)
  customPatterns: [
    { name: 'internal-token', pattern: /internal_[A-F0-9]{32}/gi }
  ],
  
  // Scan environment variables for secrets (default: true)
  scanEnv: true,
  
  // Replacement token (default: '***REDACTED***')
  replacementToken: '***REDACTED***'
});

const input = 'My API key is sk-ant-v0-abc123def456xyz...';
const result = redactor.redact(input);
// {
//   cleaned: 'My API key is ***REDACTED***',
//   redactionCount: 1,
//   detections: [
//     { pattern: 'anthropic-key', match: 'sk-ant-v0-abc123def456xyz...', position: 18 }
//   ]
// }
```

## Detection Layers

### Layer 1: Built-in Patterns

Recognizes well-known key formats:

- **Anthropic** — `sk-ant-v0-*` keys
- **OpenAI** — `sk-*` keys
- **GitHub** — `ghp_*` tokens
- **AWS** — Access keys, secret keys, session tokens
- **Stripe** — API keys (`sk_*`, `pk_*`)
- **Generic** — Common bearer token patterns
- More patterns added regularly

Enable with `useBuiltinPatterns: true` (default).

### Layer 2: Custom Patterns

Define regex patterns for internal secrets or proprietary formats:

```javascript
const redactor = new Redactor({
  customPatterns: [
    {
      name: 'internal-jwt',
      pattern: /eyJhbGc[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
    },
    {
      name: 'database-password',
      pattern: /password\s*=\s*[^\s;]+/gi
    }
  ]
});
```

### Layer 3: Environment Variable Scanning

When `scanEnv: true`, the redactor scans `process.env` for values that look like secrets (keys, tokens, URLs with credentials). Any value matching known patterns is added to the detection list.

This catches secrets that are loaded into the environment but never explicitly configured.

## API

### `new Redactor(options)`

Create a new redactor instance.

**Options:**

- `useBuiltinPatterns` (boolean, default: `true`) — Enable built-in secret patterns
- `customPatterns` (Pattern[], default: `[]`) — Custom regex patterns
- `scanEnv` (boolean, default: `true`) — Scan process.env for secrets
- `replacementToken` (string, default: `'***REDACTED***'`) — Replacement text

### `redactor.redact(input: string): RedactResult`

Scan and redact secrets from input. Returns:

```typescript
interface RedactResult {
  cleaned: string;           // Redacted text
  redactionCount: number;    // How many secrets were found
  detections: Detection[];   // Details of each detection
}

interface Detection {
  pattern: string;     // Name of the matching pattern
  match: string;       // The matched secret (may be partial if very long)
  position: number;    // Index in the original text
  length: number;      // Length of the match
}
```

## Examples

```javascript
// Redact API keys in HTTP response
const response = await fetch('https://api.example.com/data');
const body = await response.text();
const safe = redactor.redact(body);
agent.log(safe.cleaned); // Logs are now safe

// Redact entire files before agent processing
const fileContent = fs.readFileSync('./config.json', 'utf8');
const cleaned = redactor.redact(fileContent);

// Check what was detected
const result = redactor.redact(input);
if (result.redactionCount > 0) {
  console.warn(`Found ${result.redactionCount} secrets in input`);
  result.detections.forEach(d => {
    console.warn(`  - ${d.pattern} at position ${d.position}`);
  });
}
```

## Performance

- O(n) scanning where n = input length
- Regex patterns are compiled once at creation
- Safe for streaming input (scan each chunk)

## Security Notes

- This is **defense in depth** — it catches obvious secrets but isn't foolproof
- Redacted output should still be treated as potentially sensitive (could contain partial information)
- For highly sensitive workflows, consider additional measures (sandboxing, air-gapping)
- The redaction token itself is visible in cleaned output — tailor it for your context

## See Also

- [AgentChat](https://github.com/tjamescouch/agentchat) — the agent communication platform
- [Built-in Patterns](src/patterns.ts) — exhaustive list of detectable secret formats

## License

MIT
