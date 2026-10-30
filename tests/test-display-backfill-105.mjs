// 2026.10.5 — latest-state backfill + dual card element / status fallback wiring.
import { loadBundle, extractArrow, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const modern = src.includes("UPDATE_BUDGET_WINDOW_MS");
const { ok, finish } = makeCounter();

// ---------- 1) queueFeishuStreamingUpdate: providers are evaluated after card start ----------
const qStart = src.indexOf("function queueFeishuStreamingUpdate(params) {");
const qEnd = src.indexOf("\n}", qStart) + 2;
ok("queueFeishuStreamingUpdate found", qStart > 0 && qEnd > qStart);
const queueSrc = src.slice(qStart, qEnd);
const queueFn = new Function(`${queueSrc}\nreturn queueFeishuStreamingUpdate;`)();

let providerCalls = 0;
let statusProviderCalls = 0;
let latest = "state-before-start";
let latestStatus = "status-before-start";
let resolveStart;
const startPromise = new Promise((resolve) => { resolveStart = resolve; });
const calls = [];
const session = {
  isActive: () => true,
  update: (text) => { calls.push(["content", text]); return Promise.resolve(); },
  updateStatus: (text) => { calls.push(["status", text]); return Promise.resolve(true); }
};
const pending = queueFn({
  queue: Promise.resolve(),
  session,
  generation: 1,
  startPromise,
  content: () => { providerCalls += 1; return latest; },
  status: () => { statusProviderCalls += 1; return latestStatus; },
  statusElement: true,
  accountId: "acct",
  runtime: { error: () => void 0 },
  onStatusUnavailable: () => { calls.push(["unavailable"]); }
});
await new Promise((resolve) => setTimeout(resolve, 0));
ok("providers not evaluated before card start", providerCalls === 0 && statusProviderCalls === 0);
latest = "latest-content";
latestStatus = "latest-status";
resolveStart();
await pending;
ok("content rendered from latest state after start", calls.some(([k, v]) => k === "content" && v === "latest-content"), JSON.stringify(calls));
ok("status rendered from latest state after start", calls.some(([k, v]) => k === "status" && v === "latest-status"));
ok("provider evaluated only after start", providerCalls === 1 && statusProviderCalls === 1);

// ---------- 2) status-element failure triggers content fallback callback ----------
let statusFailed = false;
const session2 = {
  isActive: () => true,
  update: () => Promise.resolve(),
  updateStatus: () => Promise.resolve(false)
};
const pending2 = queueFn({
  queue: Promise.resolve(),
  session: session2,
  generation: 1,
  startPromise: null,
  content: () => "content",
  status: () => "status",
  statusElement: true,
  accountId: "acct",
  runtime: { error: () => void 0 },
  onStatusUnavailable: () => { statusFailed = true; }
});
await pending2;
ok("status failure invokes fallback callback", statusFailed === true);

// ---------- 3) structural: dual element + status API + fallback + configs ----------
ok("card JSON includes status element", /element_id: "status"/.test(src));
ok("status element only when enabled / position configurable", /element_id: "status"/.test(src) && /this\.statusElementEnabled && this\.statusPosition === "top"/.test(src) && /this\.statusElementEnabled && this\.statusPosition !== "top"/.test(src));
ok("session has updateStatus", /async updateStatus\(text, options = \{\}\) \{/.test(src));
ok("status element endpoint used", /`\/\$\{this\.state\.cardId\}\/elements\/status\/content`/.test(src));
ok("status write uses shared sequence/uuid", /uuid: `st_\$\{this\.state\.cardId\}_\$\{this\.state\.sequence\}`/.test(src));
ok("status update failure marks unavailable", /this\.statusUnavailable = true;/.test(src));
ok("status failure falls back into content", /!statusElementEnabled \|\| streaming\?\.isStatusUnavailable\?\.\(\) === true \? buildStatusText\(\) : ""/.test(src));
ok("close deletes status element (fallback zero-width)", /async deleteStatusElement\(\) \{/.test(src) && /const deleted = await this\.deleteStatusElement\(\)\.catch\(\(\) => false\);/.test(src));
ok("empty status maps to zero-width marker", /CardKit rejects empty element content/.test(src) && /const safeText = typeof text === "string" && text\.trim\(\) !== "" \? text : "\\u200B";/.test(src));
ok("updateStatus normalizes empty text", /const safeText = text\.trim\(\) !== "" \? text : "\\u200B";/.test(src));
ok("status updates throttled", /schedulePendingStatusFlush/.test(src) && /statusLastUpdateTime/.test(src));
ok("status element is a fixed default", modern ? /const statusElementEnabled = true;/.test(src) : /cardStatusElement !== false/.test(src));
ok("content/status flush is coalesced while starting", /cardFlushPending/.test(src));
ok("early card prewarm is a fixed default", modern ? /if \(previewStreamingEnabled && renderMode !== "raw"\) \{/.test(src) : /prewarmCard !== false/.test(src));
ok("start latency logged", /streaming card ready in \$\{Date\.now\(\) - cardStartAt\}ms/.test(src));
ok("backoff reduced to 15s", /STREAMING_START_FAILURE_BACKOFF_MS = 15e3;/.test(src));
ok("hold window is a fixed default", modern ? /const CARD_IDLE_HOLD_MS = 8000;/.test(src) : /cardIdleHoldMs/.test(src));
ok("progress texts are fixed defaults", modern ? /const resolveProgressText = \(key, fallback\) => \{\s*return fallback;/.test(src) : /progressTexts/.test(src));
ok("compact status budget configured", /STATUS_LINE_MAX_CHARS = 160;/.test(src));

// ---------- 3b) prewarm keeps the card non-blank ----------
ok("prewarm status requested at reply start", /prewarmRequested = true;\s*startStreaming\(\);/.test(src));
ok("prewarm status rendered when card becomes ready", src.includes('resolveProgressText("prewarm"') && src.includes('prewarmStatusLine = resolveProgressText'));
ok("prewarm text is thinking", src.includes("\\u23F3 \\u601d\\u8003\\u4e2d\\u2026"));
ok("prewarm status clears on first content/waiting/narration", /const clearPrewarmStatus = \(\) => \{/.test(src) && (src.match(/clearPrewarmStatus\(\);/g) || []).length >= 5);
ok("waiting line replaces prewarm status", /prewarmStatusLine = "";\s*waitingLine = nextWaitingLine;/.test(src));
ok("prewarm text source is fixed", modern ? !/progressTexts/.test(src) : (/progressTexts\?\.\[key\]/.test(src) || /progressTexts/.test(src)));

// ---------- 4) status fallback text renderer ordering ----------
const truncateStart = src.indexOf("const truncateDisplayText = (text, max) => {");
const statusStart = src.indexOf("const buildStatusText = () => {");
const statusEnd = src.indexOf("\n\t};", statusStart) + 4;
const greyLine = src.match(/const greyStatus = [^\n]+/)[0];
const statusFn = new Function(`
let waitingLine = "waiting"; let narrationLine = "\u{1F4AC} narration"; let itemStatusLine = "item"; let compactionLine = "compact";
let errorNoticeLine = "", reasoningText = "", streamText = "", finalDeliveryInProgress = false;
const STATUS_LINE_MAX_CHARS = 160;
${src.slice(truncateStart, src.indexOf("\n\t};", truncateStart) + 4)}
${greyLine}
${src.match(/const sanitizeStatusNarration = [^\n]+/)?.[0] || "const sanitizeStatusNarration = (text) => text;"}
${src.slice(statusStart, statusEnd)}
return buildStatusText;
`)();
ok("merged status: phase plus narration, grey", statusFn().includes("waiting") && statusFn().includes("narration") && statusFn().startsWith("<font"), statusFn());

// ---------- 5) display batch 1: compact status, elapsed/last tool, narration cap, timer ----------
ok("narration max is a single-line cap", /const NARRATION_MAX_CHARS = 120;/.test(src));
ok("status renderer stays single-line and grey", /greyStatus\(truncateDisplayText\(merged, STATUS_LINE_MAX_CHARS\)\)/.test(src));
ok("waiting line has last-tool detail", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /const details = \[\];/.test(src));
ok("waiting line has elapsed detail", /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /formatElapsedDuration\(elapsedMs\)/.test(src));
ok("elapsed refresh timer is a fixed 15s", /TOOL_ELAPSED_REFRESH_MS = 15e3/.test(src) && /if \(!SHOW_TOOL_ELAPSED \|\| waitingRefreshTimer/.test(src) && /scheduleWaitingRefresh\(\);/.test(src));
ok("elapsed timer cleared on final/close/reply", (src.match(/clearWaitingRefreshTimer\(\);/g) || []).length >= 4);
ok("assistant start keeps initial status when blank", /else \{[\s\S]{0,400}if \(!prewarmStatusLine && !waitingLine\) \{\s*prewarmStatusLine = resolveProgressText\("processing"/.test(src));
{
  const fmt = extractArrow(src, "formatElapsedDuration");
  const f = new Function(`${fmt}\nreturn formatElapsedDuration;`)();
  ok("format elapsed seconds", f(0) === "0s" && f(59_000) === "59s");
  ok("format elapsed minutes", f(60_000) === "1m00s" && f(125_000) === "2m05s");
}
{
  const fmtBody = extractArrow(src, "formatElapsedDuration");
  const bwl = extractArrow(src, "buildWaitingLine");
  const displayMap = src.match(/const TOOL_DISPLAY_NAME_BY_LABEL = [\s\S]*?\]\);/)[0];
  const aliases = src.match(/const TOOL_LABEL_ALIASES = [^\n]+/)[0];
  const normalize = extractArrow(src, "normalizeToolLabel");
  const display = extractArrow(src, "formatToolDisplayName");
  const escapeHtml = src.slice(src.indexOf("function escapeCardHtml(text)"), src.indexOf("\n}", src.indexOf("function escapeCardHtml(text)")) + 2);
  const fn = new Function(`
let waitingLine = "", lastToolLabel = "Read", toolPhaseStartedAt = 0;
const SHOW_LAST_TOOL_LABEL = true, SHOW_TOOL_ELAPSED = true;
const resolveProgressText = (key, fallback) => fallback;
${fmtBody}
${escapeHtml}
${displayMap}
${aliases}
${normalize}
${display}
${bwl}
return { build: buildWaitingLine, start: (ms) => { toolPhaseStartedAt = Date.now() - ms; } };
`)();
  ok("waiting line includes a friendly last tool", fn.build(3) === "⏳ 已执行 3 个工具 · 最近：读取", fn.build(3));
  fn.start(12_000);
  const line = fn.build(3);
  ok("waiting line includes elapsed", /12s/.test(line) && line.includes("最近：读取"), line);
}

// ---------- 6) display batch 2: status position, reasoning cap/final hide, final summary ----------
ok("status position defaults to top", /const statusPosition = "top";/.test(src));
ok("status position passed to session", /statusPosition \}/.test(src) && /this\.statusPosition = options\.statusPosition === "top" \? "top" : "bottom";/.test(src));
ok("reasoning max lines is a fixed 12", /const REASONING_MAX_LINES = 12;/.test(src));
ok("reasoning preview adds ellipsis when capped", src.includes("lines.length > REASONING_MAX_LINES") && src.includes("\\n\\u2026"));
ok("final hides reasoning from details panel", /const HIDE_REASONING_IN_FINAL = true;/.test(src) && /finalReasoningForPanel/.test(src) && /buildDetailsPanelContent/.test(src));
ok("completion summary is not duplicated in body", !/text = `\$\{text\}\n\n> \$\{buildFinalSummaryLine/.test(src));
// ---------- 7) block payloads are merged, never blindly appended ----------
ok("block delivery uses dedupe merge", /if \(info\?\.kind === "block"\) queueStreamingBlockUpdate\(text\);/.test(src));
{
  const start = src.indexOf("function mergeStreamingText(");
  const end = src.indexOf("\n}\n", start) + 3;
  const mergeFn = new Function(`${src.slice(start, end)}\nreturn mergeStreamingText;`)();
  const full = "完整回答：这是最终内容";
  const prefix = full.slice(0, 8);
  ok("shorter prefix copy is dropped", mergeFn(full, prefix) === full, JSON.stringify(mergeFn(full, prefix)));
  ok("longer extension replaces prefix", mergeFn(prefix, full) === full);
  ok("genuinely new block still appends", mergeFn("block A", "block B") === "block Ablock B");
}

finish("2026.10.5 display/backfill/session");
