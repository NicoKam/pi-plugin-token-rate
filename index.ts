import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

/**
 * Token-rate monitor extension.
 *
 * While the assistant is streaming a response, estimates the output token rate
 * from accumulated delta text with a CJK-aware chars-per-token heuristic and
 * refreshes an above-editor widget every 500ms.
 *
 * Uses `setWidget` (not `setStatus`) so a leading blank line separates the
 * indicator from the transcript, and no trailing blank line is emitted.
 *
 * The provider-reported usage object is not available until the terminal stream
 * event, so it cannot drive a mid-stream rate display; this extension counts
 * delta characters instead.
 */

const WIDGET_KEY = "token-rate";
const REFRESH_MS = 500;
const LATIN_CHARS_PER_TOKEN = 4.0;
const CJK_CHARS_PER_TOKEN = 1.4;

type Rgb = { r: number; g: number; b: number };

const SPEED_COLOR_STOPS: Array<{ tokPerSec: number; color: Rgb }> = [
  // Industry-oriented live-output bands: heavyweight models can sit at 20–50
  // tok/s, mainstream hosted models are often 50–100 tok/s, and lightweight /
  // flash models may exceed 100 tok/s. Clamp above 120 as "very fast".
  { tokPerSec: 0, color: { r: 255, g: 85, b: 85 } },
  { tokPerSec: 15, color: { r: 255, g: 128, b: 64 } },
  { tokPerSec: 35, color: { r: 255, g: 191, b: 51 } },
  { tokPerSec: 55, color: { r: 204, g: 238, b: 68 } },
  { tokPerSec: 80, color: { r: 68, g: 221, b: 68 } },
  { tokPerSec: 120, color: { r: 34, g: 197, b: 94 } },
];

function colorForRate(tokPerSec: number): Rgb {
  if (tokPerSec <= SPEED_COLOR_STOPS[0].tokPerSec) {
    return SPEED_COLOR_STOPS[0].color;
  }

  for (let i = 1; i < SPEED_COLOR_STOPS.length; i += 1) {
    const prev = SPEED_COLOR_STOPS[i - 1];
    const next = SPEED_COLOR_STOPS[i];
    if (tokPerSec > next.tokPerSec) continue;

    const ratio =
      (tokPerSec - prev.tokPerSec) / (next.tokPerSec - prev.tokPerSec);
    return {
      r: Math.round(prev.color.r + (next.color.r - prev.color.r) * ratio),
      g: Math.round(prev.color.g + (next.color.g - prev.color.g) * ratio),
      b: Math.round(prev.color.b + (next.color.b - prev.color.b) * ratio),
    };
  }

  return SPEED_COLOR_STOPS[SPEED_COLOR_STOPS.length - 1].color;
}

function formatRateLine(icon: string, tokPerSec: number, suffix: string): string {
  const { r, g, b } = colorForRate(tokPerSec);
  const text = `${icon} ${tokPerSec.toFixed(1)} tok/s ${suffix}`;
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function estimateDeltaTokens(delta: string): number {
  let cjkChars = 0;
  let effectiveChars = 0;

  for (const char of delta) {
    if (/\s/u.test(char)) continue;
    effectiveChars += 1;

    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(char)) {
      cjkChars += 1;
    }
  }

  if (effectiveChars === 0) return 0;

  const cjkRatio = cjkChars / effectiveChars;
  const effectiveCharsPerToken =
    LATIN_CHARS_PER_TOKEN * (1 - cjkRatio) +
    CJK_CHARS_PER_TOKEN * cjkRatio;

  return Math.max(1, Math.ceil(effectiveChars / effectiveCharsPerToken));
}

export default function (pi: ExtensionAPI): void {
  let streaming = false;
  let startedAt = 0;
  let tokenCount = 0;
  let timer: unknown = null;

  function clearTimer(ctx: { clearTimer: (t: unknown) => void }) {
    if (timer !== null) {
      ctx.clearTimer(timer);
      timer = null;
    }
  }

  function clearWidget(ctx: {
    ui: { setWidget: (k: string, c: unknown, o?: unknown) => void };
  }) {
    ctx.ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
  }

  pi.on("message_start", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    // start of a new assistant stream
    clearTimer(ctx);
    streaming = true;
    startedAt = Date.now();
    tokenCount = 0;

    timer = ctx.setInterval(() => {
      if (!streaming) return;
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs <= 0) return;
      const tokPerSec = (tokenCount / elapsedMs) * 1000;
      // leading "" → blank separator line above; no trailing blank line
      ctx.ui.setWidget(
        WIDGET_KEY,
        ["", formatRateLine("🚀", tokPerSec, `(${tokenCount} tok)`)],
        { placement: "aboveEditor" },
      );
    }, REFRESH_MS);
  });

  pi.on("message_update", async (event) => {
    if (!streaming) return;
    const e = event.assistantMessageEvent;
    let delta: string | undefined;
    switch (e.type) {
      case "text_delta":
      case "thinking_delta":
      case "toolcall_delta":
        delta = e.delta;
        break;
      default:
        return;
    }
    if (!delta) return;
    // Industry-standard heuristic when no model tokenizer is available:
    // chars-per-token with a CJK-ratio adjustment.
    tokenCount += estimateDeltaTokens(delta);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (!streaming) return;
    clearTimer(ctx);
    streaming = false;
    const elapsedMs = Date.now() - startedAt;
    const finalRate = elapsedMs > 0 ? (tokenCount / elapsedMs) * 1000 : 0;
    ctx.ui.setWidget(
      WIDGET_KEY,
      ["", formatRateLine("✅", finalRate, `(${tokenCount} tok, ${(elapsedMs / 1000).toFixed(1)}s)`)],
      { placement: "aboveEditor" },
    );
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    clearTimer(ctx);
    clearWidget(ctx);
  });
}
