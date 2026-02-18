# constraints

## technology

- TypeScript, ES module format
- Node.js streams API for Transform support
- zero runtime dependencies

## style

- patterns are data, not code — flat array of `{name, regex}` objects
- redactor is a class (holds compiled state), but detection is stateless per call
- no async — all operations are synchronous except the stream transform

## security

- never log or expose the original secret value in error messages
- env scanning is opt-in to avoid surprising behavior
- replacement strings must not leak information about the secret's content

## testing

- test runner: `node --test` with `--experimental-strip-types`
- tests cover all built-in patterns, env scanning, stream mode, labeling, and edge cases
