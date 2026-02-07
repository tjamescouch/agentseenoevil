/**
 * agentseenoevil — Input stream redactor for AI agents.
 *
 * Scans text for API keys, tokens, and secrets before agents process them.
 * Three detection layers:
 *   1. Built-in regex patterns for known key formats (Anthropic, OpenAI, GitHub, AWS, etc.)
 *   2. User-defined custom patterns
 *   3. Automatic process.env value scanning (finds env vars that look like secrets)
 */

export { Redactor } from './redactor.js';
export type { RedactorOptions, RedactResult } from './redactor.js';
export { BUILTIN_PATTERNS, SECRET_ENV_KEY_PATTERNS } from './patterns.js';
export type { SecretPattern } from './patterns.js';
