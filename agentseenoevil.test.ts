/**
 * agentseenoevil Tests
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { Redactor } from './dist/redactor.js';
import { BUILTIN_PATTERNS, SECRET_ENV_KEY_PATTERNS } from './dist/patterns.js';

describe('Patterns', () => {
  test('BUILTIN_PATTERNS is a non-empty array', () => {
    assert.ok(Array.isArray(BUILTIN_PATTERNS));
    assert.ok(BUILTIN_PATTERNS.length > 0);
  });

  test('each pattern has name and regex', () => {
    for (const p of BUILTIN_PATTERNS) {
      assert.ok(typeof p.name === 'string');
      assert.ok(p.pattern instanceof RegExp);
    }
  });

  test('SECRET_ENV_KEY_PATTERNS is a non-empty array', () => {
    assert.ok(Array.isArray(SECRET_ENV_KEY_PATTERNS));
    assert.ok(SECRET_ENV_KEY_PATTERNS.length > 0);
  });
});

describe('Redactor - Built-in Patterns', () => {
  const r = new Redactor();

  test('redacts Anthropic API keys', () => {
    const input = 'My key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('sk-ant-'));
    assert.ok(result.text.includes('[REDACTED]'));
  });

  test('redacts OpenAI API keys', () => {
    const input = 'key: sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('sk-abcdefghijklmnopqrstuvwxyz'));
  });

  test('redacts GitHub PATs', () => {
    const input = 'token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('ghp_'));
  });

  test('redacts AWS access keys', () => {
    const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('AKIAIOSFODNN7'));
  });

  test('redacts Slack tokens', () => {
    const input = 'SLACK_TOKEN=xoxb-1234567890-abcdefghij';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('xoxb-'));
  });

  test('redacts Stripe keys', () => {
    // Using sk_test_ prefix (test mode key) to avoid GitHub push protection
    const input = 'stripe_key: sk_test_abcdefghijklmnopqrstuvwxyz';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('sk_test_'));
  });

  test('redacts Google API keys', () => {
    const input = 'key=AIzaSyA1234567890abcdefghijklmnopqrstuvw';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('AIzaSy'));
  });

  test('redacts JWT tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456ghi789';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('eyJhbGci'));
  });

  test('redacts generic secrets near keywords', () => {
    const input = 'api_key="abcdefghijklmnopqrstuvwxyz1234567890"';
    const result = r.redact(input);
    assert.ok(result.count > 0);
  });

  test('preserves non-secret text', () => {
    const input = 'Hello world, this is a normal message with no secrets.';
    const result = r.redact(input);
    assert.strictEqual(result.count, 0);
    assert.strictEqual(result.text, input);
    assert.deepStrictEqual(result.matched, []);
  });

  test('handles multiple secrets in one string', () => {
    const input = 'Keys: sk-ant-api03-aaaaaaaaaaaaaaaaaaaaaa and ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.ok(result.count >= 2);
    assert.ok(!result.text.includes('sk-ant-'));
    assert.ok(!result.text.includes('ghp_'));
  });
});

describe('Redactor - Environment Variable Scanning', () => {
  const originalEnv: Record<string, string | undefined> = {};

  before(() => {
    // Save and set test env vars
    originalEnv.TEST_API_KEY = process.env.TEST_API_KEY;
    originalEnv.TEST_SECRET = process.env.TEST_SECRET;
    originalEnv.TEST_TOKEN = process.env.TEST_TOKEN;
    originalEnv.TEST_NORMAL = process.env.TEST_NORMAL;

    process.env.TEST_API_KEY = 'super-secret-api-key-12345';
    process.env.TEST_SECRET = 'my-ultra-secret-value';
    process.env.TEST_TOKEN = 'tok_abcdefghijklmnop';
    process.env.TEST_NORMAL = 'just-a-normal-value';
  });

  after(() => {
    // Restore env
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  test('redacts env var values when scanEnv is true', () => {
    const r = new Redactor({ scanEnv: true });
    const input = 'The key is super-secret-api-key-12345 and the token is tok_abcdefghijklmnop';
    const result = r.redact(input);
    assert.ok(result.count >= 2);
    assert.ok(!result.text.includes('super-secret-api-key-12345'));
    assert.ok(!result.text.includes('tok_abcdefghijklmnop'));
  });

  test('does not redact non-secret env vars', () => {
    const r = new Redactor({ scanEnv: true, builtins: false });
    const input = 'The value is just-a-normal-value';
    const result = r.redact(input);
    // TEST_NORMAL doesn't match any SECRET_ENV_KEY_PATTERNS
    assert.strictEqual(result.count, 0);
    assert.ok(result.text.includes('just-a-normal-value'));
  });

  test('labels redactions with env var name when labelRedactions is true', () => {
    const r = new Redactor({ scanEnv: true, builtins: false, labelRedactions: true });
    const input = 'Key: super-secret-api-key-12345';
    const result = r.redact(input);
    assert.ok(result.text.includes('[REDACTED:env:TEST_API_KEY]'));
  });

  test('respects minEnvValueLength', () => {
    process.env.TEST_SHORT_KEY = 'abc';
    const r = new Redactor({ scanEnv: true, builtins: false, minEnvValueLength: 8 });
    const input = 'Short value: abc';
    const result = r.redact(input);
    assert.strictEqual(result.count, 0);
    delete process.env.TEST_SHORT_KEY;
  });

  test('supports custom env key patterns', () => {
    process.env.MY_CUSTOM_CRED = 'custom-credential-value-xyz';
    const r = new Redactor({
      scanEnv: true,
      builtins: false,
      envKeyPatterns: [/_CRED$/],
    });
    const input = 'Cred: custom-credential-value-xyz';
    const result = r.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('custom-credential-value-xyz'));
    delete process.env.MY_CUSTOM_CRED;
  });
});

describe('Redactor - Custom Patterns', () => {
  test('uses user-defined patterns', () => {
    const r = new Redactor({
      builtins: false,
      patterns: [
        { name: 'internal_id', pattern: /INTERNAL-[A-Z0-9]{8}/ },
      ],
    });

    const input = 'Reference: INTERNAL-AB12CD34';
    const result = r.redact(input);
    assert.strictEqual(result.count, 1);
    assert.ok(!result.text.includes('INTERNAL-AB12CD34'));
    assert.deepStrictEqual(result.matched, ['internal_id']);
  });

  test('combines builtins and custom patterns', () => {
    const r = new Redactor({
      patterns: [
        { name: 'custom', pattern: /MYCORP-[0-9]{6}/ },
      ],
    });

    const input = 'Corp: MYCORP-123456 and key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.ok(result.count >= 2);
    assert.ok(!result.text.includes('MYCORP-123456'));
    assert.ok(!result.text.includes('ghp_'));
  });
});

describe('Redactor - Options', () => {
  test('custom replacement string', () => {
    const r = new Redactor({ replacement: '***' });
    const input = 'key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.ok(result.text.includes('***'));
    assert.ok(!result.text.includes('[REDACTED]'));
  });

  test('labeled redactions include pattern name', () => {
    const r = new Redactor({ labelRedactions: true });
    const input = 'key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.ok(result.text.includes('[REDACTED:github_pat]'));
  });

  test('disabling builtins only uses custom patterns', () => {
    const r = new Redactor({ builtins: false });
    const input = 'key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.redact(input);
    assert.strictEqual(result.count, 0);
    assert.ok(result.text.includes('ghp_'));
  });
});

describe('Redactor - Convenience Methods', () => {
  const r = new Redactor();

  test('clean() returns just the redacted string', () => {
    const input = 'key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = r.clean(input);
    assert.ok(typeof result === 'string');
    assert.ok(!result.includes('ghp_'));
  });

  test('hasSecrets() returns true when secrets found', () => {
    assert.strictEqual(r.hasSecrets('key: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'), true);
  });

  test('hasSecrets() returns false for clean text', () => {
    assert.strictEqual(r.hasSecrets('Hello world'), false);
  });
});

describe('Redactor - Stream Transform', () => {
  test('creates a working transform stream', async () => {
    const r = new Redactor();
    const transform = r.createStream();

    const input = 'My key is ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n';
    const chunks: string[] = [];

    const source = Readable.from([input]);
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    });

    await pipeline(source, transform, sink);

    const output = chunks.join('');
    assert.ok(!output.includes('ghp_'));
    assert.ok(output.includes('[REDACTED]'));
  });

  test('stream handles multiple chunks', async () => {
    const r = new Redactor();
    const transform = r.createStream();

    const chunks: string[] = [];
    const source = Readable.from([
      'First chunk with sk-ant-api03-aaaaaaaaaaaaaaaaaaaaaa\n',
      'Second chunk clean\n',
      'Third with ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij\n',
    ]);
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    });

    await pipeline(source, transform, sink);

    const output = chunks.join('');
    assert.ok(!output.includes('sk-ant-'));
    assert.ok(!output.includes('ghp_'));
    assert.ok(output.includes('Second chunk clean'));
  });
});

describe('Redactor - Edge Cases', () => {
  const r = new Redactor();

  test('handles empty string', () => {
    const result = r.redact('');
    assert.strictEqual(result.text, '');
    assert.strictEqual(result.count, 0);
  });

  test('handles string with only whitespace', () => {
    const result = r.redact('   \n\t  ');
    assert.strictEqual(result.text, '   \n\t  ');
    assert.strictEqual(result.count, 0);
  });

  test('redacts multiple occurrences of same key', () => {
    const key = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const input = `first: ${key} and second: ${key}`;
    const result = r.redact(input);
    assert.strictEqual(result.count, 2);
    assert.ok(!result.text.includes('ghp_'));
  });

  test('handles special regex characters in env values', () => {
    process.env.TEST_REGEX_KEY = 'value+with.special*chars';
    const r2 = new Redactor({ scanEnv: true, builtins: false });
    const input = 'Data: value+with.special*chars here';
    const result = r2.redact(input);
    assert.ok(result.count > 0);
    assert.ok(!result.text.includes('value+with.special*chars'));
    delete process.env.TEST_REGEX_KEY;
  });
});
