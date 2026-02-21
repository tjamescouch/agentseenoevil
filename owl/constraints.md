# agentseenoevil — Constraints

## What This Is

A TypeScript library for redacting secrets from text streams before they reach AI agents. Scans input for API keys, tokens, and credentials using regex patterns.

## What This Is Not

- **Not a complete security solution** — Defense in depth only. Agents should still operate in sandboxed environments.
- **Not a secrets manager** — Doesn't store or manage secrets, only detects and redacts them.
- **Not context-aware** — Doesn't understand semantics, just pattern matching. May have false positives/negatives.
- **Not a substitute for secure coding** — Secrets should never be hardcoded. This catches mistakes, not replaces best practices.

## Design Constraints

### Performance

- **O(n) scanning** — Linear time complexity where n = input length.
- **Single-pass** — All patterns evaluated in one pass through the text.
- **Compiled patterns** — Regex patterns compiled once at creation, reused for all scans.
- **No backtracking** — Patterns designed to avoid catastrophic backtracking.

### Detection Quality

- **High precision** — Minimize false positives. Better to miss a secret than flag legitimate text.
- **Pattern-based** — Relies on recognizable formats. Cannot detect generic passwords or unstructured secrets.
- **Explicit over implicit** — Built-in patterns target well-known formats. Custom patterns required for proprietary formats.

### API Stability

- **Immutable redactor** — Redactor instances are stateless and reusable.
- **Synchronous operation** — No async I/O. Redaction is a pure function.
- **Structured results** — Always returns `{ cleaned, redactionCount, detections }` — never throws on valid input.

### Scope

- **Text-only** — Does not scan binary files, images, or non-UTF-8 encodings.
- **No network calls** — All detection happens locally. No external API lookups.
- **No persistent state** — Redactor instances do not maintain history or learning models.

## Non-Goals

- **Entropy analysis** — We don't compute entropy to detect random-looking strings. Too many false positives.
- **Machine learning** — No ML-based detection. Keeps the library lightweight and deterministic.
- **File format parsing** — Does not parse JSON, YAML, or other structured formats. Treats all input as plain text.
- **Secret rotation/management** — Does not generate, store, or rotate secrets.
- **Audit logging** — Does not log detections to external systems. Caller's responsibility.

## Security Assumptions

- **Honest caller** — Assumes the code calling the redactor is trusted. Does not prevent intentional leaks.
- **Single-threaded** — Not designed for concurrent access without external synchronization.
- **No side channels** — Does not protect against timing attacks or memory inspection.

## Known Limitations

- **Partial matches** — If a secret is split across multiple input chunks (e.g., streaming), it may not be detected.
- **Obfuscation** — Cannot detect secrets that are encoded, encrypted, or obfuscated.
- **Context-sensitive secrets** — Some secrets (e.g., database passwords) are only secrets in certain contexts. Redactor has no context awareness.
- **False negatives** — Proprietary or unusual secret formats require custom patterns.

## Usage Constraints

- **Pre-processing only** — Designed for pre-processing input before it reaches the agent, not for post-processing outputs.
- **Not a firewall** — Does not block network requests or file access. Only scans text.
- **No guarantee of completeness** — Redaction reduces risk but does not eliminate it.

## Dependencies

- **Minimal** — No external dependencies beyond Node.js built-ins and TypeScript.
- **No network** — All logic is local.

## Testing

- **Pattern coverage** — Each built-in pattern must have tests with real-world examples.
- **False positive checks** — Tests include common non-secret strings that should NOT be redacted.
- **Performance benchmarks** — Large input tests (1MB+) to ensure O(n) scaling.

## Maintenance

- **Pattern updates** — Built-in patterns must be updated as providers change key formats.
- **Breaking changes** — API changes require major version bump.
- **Backward compatibility** — Redactor options must remain backward compatible within major versions.

## License

MIT — Use at your own risk. No warranty.
