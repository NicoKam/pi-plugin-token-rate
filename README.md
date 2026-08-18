# pi-plugin-token-rate

English | [简体中文](./README.zh-CN.md)

An Oh My Pi / OMP and upstream Pi extension that shows live assistant output speed while a response is streaming.

![Token rate indicator demo](./assets/demo.svg)

## Features

- Displays a rolling two-second output rate every 500ms; each completed assistant message retains its last active rate and shows `🔄` until the next message produces output.
- Shows `🔄` while the model is processing between assistant messages, `🚀` while streaming, and `✅` when the agent completes.
- Uses a red → yellow → green truecolor gradient based on tok/s.
- Keeps the indicator above the input box, separated from transcript content by one blank line.
- Estimates output tokens locally from stream deltas with a CJK-aware chars-per-token heuristic.
- Shows the estimated token count for the current response and the cumulative session total, formatted with thousands separators.

## Token counting accuracy

This plugin estimates live output tokens because most providers only expose authoritative usage at the end of a streamed response.

Current heuristic:

- Latin text: `4.0 chars/token`
- CJK text: `1.4 chars/token`
- Whitespace is ignored.
- Mixed text is weighted by CJK character ratio.

The displayed tok/s is a UI speed indicator for live feedback, not a billing counter or billing-grade accounting source.

Tested with OMP `17.3.5`.

## Compatibility

Compatible with OMP and upstream Pi. The extension uses their shared `ExtensionAPI`; its OMP type-only import is erased at runtime. The manifest declares both `omp.extensions` and `pi.extensions` for package discovery.

## Install

### Option 1: clone and load once

```bash
git clone https://github.com/NicoKam/pi-plugin-token-rate.git
omp --extension ./pi-plugin-token-rate
```

### Option 2: load an existing local copy

From any directory:

```bash
omp --extension /path/to/pi-plugin-token-rate
```

### Option 3: persistent config

Add the plugin path to `~/.omp/agent/config.yml`:

```yaml
extensions:
  - /path/to/pi-plugin-token-rate
```

If `extensions` already exists, append the path instead of replacing the list:

```yaml
extensions:
  - /existing/extension
  - /path/to/pi-plugin-token-rate
```

Restart `omp` after changing the config.

### Option 4: automatic discovery

Copy the plugin into OMP's user extension directory:

```bash
mkdir -p ~/.omp/agent/extensions
cp -R /path/to/pi-plugin-token-rate ~/.omp/agent/extensions/
```

Restart `omp`.

### Pi

Load once:

```bash
pi --extension /path/to/pi-plugin-token-rate/index.ts
```

Or copy `index.ts` to Pi's user extension directory:

```bash
mkdir -p ~/.pi/agent/extensions
cp /path/to/pi-plugin-token-rate/index.ts ~/.pi/agent/extensions/token-rate.ts
```

Restart `pi` after copying it.

## Development

OMP loads TypeScript extension entrypoints directly with Bun. No build step is required for normal use.

Smoke-check syntax:

```bash
bun build --no-bundle index.ts --outfile /dev/null
```

Run with the local plugin:

```bash
omp --extension .
```
