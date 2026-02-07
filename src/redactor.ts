/**
 * Redactor — scans text for secrets and replaces them.
 *
 * Three layers of detection:
 * 1. Built-in patterns for known API key formats
 * 2. User-defined custom patterns
 * 3. Environment variable value scanning (opt-in)
 */

import { Transform, TransformCallback } from 'stream';
import { BUILTIN_PATTERNS, SECRET_ENV_KEY_PATTERNS, SecretPattern } from './patterns.js';

export interface RedactorOptions {
  /** Use built-in patterns for known key formats. Default: true */
  builtins?: boolean;

  /** Additional user-defined patterns */
  patterns?: SecretPattern[];

  /** Scan process.env for values that look like secrets. Default: false */
  scanEnv?: boolean;

  /** Custom env key patterns to match (in addition to defaults) */
  envKeyPatterns?: RegExp[];

  /** Minimum length for env values to be considered redactable. Default: 8 */
  minEnvValueLength?: number;

  /** Replacement string. Default: '[REDACTED]' */
  replacement?: string;

  /** Include pattern name in replacement, e.g. '[REDACTED:openai_api_key]'. Default: false */
  labelRedactions?: boolean;
}

export interface RedactResult {
  /** The redacted text */
  text: string;

  /** Number of redactions made */
  count: number;

  /** Which patterns matched (by name) */
  matched: string[];
}

export class Redactor {
  private patterns: SecretPattern[];
  private envValues: Map<string, string>; // value → env key name (for labeling)
  private replacement: string;
  private labelRedactions: boolean;
  private minEnvValueLength: number;

  constructor(opts: RedactorOptions = {}) {
    this.replacement = opts.replacement || '[REDACTED]';
    this.labelRedactions = opts.labelRedactions || false;
    this.minEnvValueLength = opts.minEnvValueLength || 8;

    // Collect patterns
    this.patterns = [];
    if (opts.builtins !== false) {
      this.patterns.push(...BUILTIN_PATTERNS);
    }
    if (opts.patterns) {
      this.patterns.push(...opts.patterns);
    }

    // Scan environment variables
    this.envValues = new Map();
    if (opts.scanEnv) {
      this.loadEnvSecrets(opts.envKeyPatterns);
    }
  }

  /**
   * Scan process.env for keys that look like they hold secrets.
   */
  private loadEnvSecrets(extraPatterns?: RegExp[]): void {
    const keyPatterns = [...SECRET_ENV_KEY_PATTERNS];
    if (extraPatterns) {
      keyPatterns.push(...extraPatterns);
    }

    for (const [key, value] of Object.entries(process.env)) {
      if (!value || value.length < this.minEnvValueLength) continue;

      const isSecret = keyPatterns.some((p) => p.test(key));
      if (isSecret) {
        this.envValues.set(value, key);
      }
    }
  }

  /**
   * Redact secrets from text.
   */
  redact(input: string): RedactResult {
    let text = input;
    let count = 0;
    const matched: string[] = [];

    // Apply regex patterns
    for (const { name, pattern } of this.patterns) {
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      const matches = text.match(globalPattern);
      if (matches) {
        const rep = this.labelRedactions ? `[REDACTED:${name}]` : this.replacement;
        text = text.replace(globalPattern, rep);
        count += matches.length;
        if (!matched.includes(name)) matched.push(name);
      }
    }

    // Apply env value literal matching (longest first to avoid partial matches)
    const sortedEnvValues = [...this.envValues.entries()]
      .sort((a, b) => b[0].length - a[0].length);

    for (const [value, envKey] of sortedEnvValues) {
      if (text.includes(value)) {
        const rep = this.labelRedactions ? `[REDACTED:env:${envKey}]` : this.replacement;
        // Escape special regex chars for literal matching
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'g');
        const matches = text.match(re);
        if (matches) {
          text = text.replace(re, rep);
          count += matches.length;
          const label = `env:${envKey}`;
          if (!matched.includes(label)) matched.push(label);
        }
      }
    }

    return { text, count, matched };
  }

  /**
   * Simple string redaction (returns just the cleaned text).
   */
  clean(input: string): string {
    return this.redact(input).text;
  }

  /**
   * Check if text contains any detectable secrets.
   */
  hasSecrets(input: string): boolean {
    return this.redact(input).count > 0;
  }

  /**
   * Create a Node.js Transform stream that redacts on the fly.
   * Operates on whole chunks (line-buffered for best results).
   */
  createStream(): Transform {
    const redactor = this;
    return new Transform({
      transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
        const input = chunk.toString();
        const { text } = redactor.redact(input);
        callback(null, text);
      },
    });
  }
}
