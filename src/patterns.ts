/**
 * Built-in patterns for known API key and secret formats.
 *
 * Each pattern has a name (for reporting) and a regex.
 * All regexes must NOT use the global flag — they're used with replaceAll logic.
 */

export interface SecretPattern {
  name: string;
  pattern: RegExp;
}

/**
 * Well-known API key formats.
 */
export const BUILTIN_PATTERNS: SecretPattern[] = [
  // Anthropic API keys
  { name: 'anthropic_api_key', pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/ },

  // OpenAI API keys
  { name: 'openai_api_key', pattern: /sk-[a-zA-Z0-9]{20,}/ },

  // GitHub Personal Access Tokens
  { name: 'github_pat', pattern: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'github_pat_fine', pattern: /github_pat_[a-zA-Z0-9_]{22,}/ },

  // GitHub OAuth tokens
  { name: 'github_oauth', pattern: /gho_[a-zA-Z0-9]{36}/ },

  // AWS Access Key ID
  { name: 'aws_access_key', pattern: /AKIA[A-Z0-9]{16}/ },

  // AWS Secret Access Key (40 chars, base64-ish)
  { name: 'aws_secret_key', pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)['"=:\s]+([A-Za-z0-9/+=]{40})/ },

  // Slack tokens
  { name: 'slack_token', pattern: /xox[bpaors]-[a-zA-Z0-9-]{10,}/ },

  // Stripe keys
  { name: 'stripe_key', pattern: /[sr]k_(live|test)_[a-zA-Z0-9]{20,}/ },

  // Google API key
  { name: 'google_api_key', pattern: /AIza[a-zA-Z0-9_-]{35}/ },

  // JWT tokens (three dot-separated base64 sections)
  { name: 'jwt', pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },

  // Generic high-entropy strings near secret keywords
  { name: 'generic_secret', pattern: /(?:api_key|apikey|secret|token|password|credential|auth)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-/+=]{16,})['"]/ },
];

/**
 * Environment variable key name patterns that likely hold secrets.
 */
export const SECRET_ENV_KEY_PATTERNS: RegExp[] = [
  /_KEY$/i,
  /_TOKEN$/i,
  /_SECRET$/i,
  /_PASSWORD$/i,
  /_CREDENTIAL$/i,
  /_API_KEY$/i,
  /^API_KEY$/i,
  /^SECRET$/i,
  /^TOKEN$/i,
  /^PASSWORD$/i,
  /^AUTH/i,
  /_AUTH$/i,
];
