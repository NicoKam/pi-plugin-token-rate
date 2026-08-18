# Agent Instructions

## Scope

This repository contains one OMP extension: `pi-plugin-token-rate`.

## Behavior contract

- Show live assistant output speed while streaming.
- Refresh at `REFRESH_MS` (`500ms`) unless explicitly changed.
- Keep the indicator above the editor via `setWidget(..., { placement: "aboveEditor" })`.
- Keep exactly one blank separator line above the indicator and no intentional blank line below it.
- Use `🚀` for in-progress output and `✅` for completed output.
- Preserve the red-to-green speed gradient unless the user asks for a visual change.
- Do not claim billing-grade token accuracy; live tokens are heuristic estimates.

## Implementation constraints

- Prefer one-file changes in `index.ts` unless packaging metadata or docs need updates.
- Do not add runtime dependencies without a clear accuracy or compatibility benefit.
- Do not hard-code local absolute paths, user names, tokens, hosts, or company-internal URLs.
- OMP loads TypeScript directly; avoid adding a build pipeline unless requested.

## Verification

Before handing off code changes:

```bash
bun build --no-bundle index.ts --outfile /dev/null
```

For UI behavior, run:

```bash
omp --extension .
```

Then send a short prompt and verify the widget appears above the editor.
