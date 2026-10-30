// Regression suite for the P0/P1 fixes:
//  - P0: sanitizeToolErrorText must be defined (it used to be a dangling reference).
//  - P1: empty/tool-only turns must not duplicate the completion summary in the body.
//  - P1: a carried narration line must lose its ticker prefix before becoming the body.
//  - P1: tool error counts must be accurate past the old 8-entry display cap.
import { loadBundle, extractArrow, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

// --- P0: sanitizer exists and actually redacts ------------------------------
ok("sanitizer helper is defined, not only referenced", /const sanitizeToolErrorText = \(/.test(src));
{
  const body = extractArrow(src, "sanitizeToolErrorText");
  const sanitize = new Function(`${body}\nreturn sanitizeToolErrorText;`)();
  const bearer = sanitize("Authorization: Bearer abc.def-123");
  ok("bearer token redacted", bearer.includes("[redacted]") && !bearer.includes("abc.def-123"), bearer);
  const secret = sanitize("app_secret=s3cr3t; retry");
  ok("key=value secret redacted", secret.includes("[redacted]") && !secret.includes("s3cr3t"), secret);
  ok("url credentials redacted", sanitize("https://user:pass@example.com/x").includes("://[redacted]@"));
  ok("control characters collapsed", sanitize("a\nb\tc") === "a b c");
}

// --- P1: no duplicated completion summary, no leaked narration prefix ------
ok("close no longer routes the answer through the summary helper", !/let text = resolveFinalCardText\(finalizedAnswerText, finalElapsedMs\)/.test(src));
ok("carried narration is normalized before reuse", /const carriedNarration = normalizeNarrationLine\(narrationLine\);/.test(src));
ok(
  "tool/error turns get an invisible body when the status shows the summary",
  /return statusUnavailable \? `> \$\{buildFinalSummaryLine\(elapsedMs\)\}` : "\\u200B";/.test(src)
);
{
  const bcl = extractArrow(src, "buildFinalSummaryLine");
  const rf = extractArrow(src, "resolveFinalCardText");
  const sandbox = new Function(`let aggregatedToolTotal = 0; let toolErrorTotal = 0; const formatElapsedDuration = (ms) => Math.floor(ms / 1000) + "s"; ${bcl}\n${rf}\nreturn { resolve: (a, e, su) => resolveFinalCardText(a, e, su), total: (n) => { aggregatedToolTotal = n; }, errors: (n) => { toolErrorTotal = n; } };`)();
  sandbox.total(4);
  ok("tool-only close body is invisible", sandbox.resolve("", 5000, false) === "\u200B");
  const mirrored = sandbox.resolve("", 5000, true);
  ok("tool-only close mirrors the summary only without a status element", mirrored.startsWith("> ") && mirrored.includes("4"), mirrored);
  ok("real answers are never replaced by a summary", sandbox.resolve("answer", 5000, false) === "answer");
  sandbox.total(0);
  sandbox.errors(2);
  ok("error-only turns also use the invisible body", sandbox.resolve("", 5000, false) === "\u200B");
}

// --- P1: accurate error totals --------------------------------------------
ok("tool error array replaced by a total", !src.includes("toolErrors") && src.includes("toolErrorTotal += 1"));
ok("final summary uses the true error total", /toolErrorTotal > 0 \? "\\u26a0\\ufe0f \\u5df2\\u5b8c\\u6210"/.test(src));
ok("final summary uses the true error total", /parts\.push\(`\$\{toolErrorTotal\} \\u4e2a\\u9519\\u8bef`\)/.test(src));
ok("discard guard keeps error-only cards", /shouldDiscardEmptyCard = .*toolErrorTotal === 0/.test(src));

finish("regression: error sanitizer / duplicate summary / error totals");
