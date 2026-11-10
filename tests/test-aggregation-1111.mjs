// 2026.11.1 batch7 — aggregation state, structured tool starts, compact details, prewarm.
import { loadBundle, makeCounter, extractArrow, extractAsyncArrow } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const waiting = extractArrow(src, "buildWaitingLine");
const record = extractAsyncArrow(src, "recordToolEvent");
const aggregate = extractAsyncArrow(src, "aggregateToolSummary");
const structured = extractAsyncArrow(src, "noteStructuredToolStart");
const detailsStart = src.indexOf("const TOOL_GROUP_ORDER");
const detailsEnd = src.indexOf("const buildHeldStatusLine");
if (detailsStart < 0 || detailsEnd < 0) throw new Error("details helpers missing");
const detailsHelpers = src.slice(detailsStart, detailsEnd);

const code = [
  "let previewStreamingEnabled = true;",
  "const renderMode = 'card';",
  "let aggregatedToolTotal = 0;",
  "let lastToolLabel = '';",
  "let lastToolDetail = '';",
  "let structuredToolTotal = 0;",
  "let toolEventsDropped = 0;",
  "let toolPhaseStartedAt = 0;",
  "let toolPhaseCompleted = false;",
  "let toolEvents = [];",
  "let cardStartedAt = 0;",
  "const reasoningText = '';",
  "const streamText = '';",
  "let detailsText = '';",
  "const progressLines = [];",
  "const flushes = [];",
  "let startCalls = 0;",
  "let streamingStartPromise = null;",
  "let streaming = null;",
  "const TOOL_DETAIL_PROGRESS_MAX_CHARS = 32;",
  "const TOOL_DETAIL_COMMAND_MAX_CHARS = 60;",
  "const TOOL_DETAIL_PATH_MAX_CHARS = 40;",
  "const PATH_LIKE_TOOL_LABELS = new Set(['read', 'write', 'edit']);",
  "const resolveToolIcon = (label) => label === 'exec' ? '💻' : label === 'read' ? '📖' : '🔧';",
  "const toolDetailFromArgs = (label, args) => { if (label === 'exec' && typeof args?.command === 'string') return args.command; if (label === 'read' && typeof args?.path === 'string') return args.path; return ''; };",
  "const startStreaming = () => { if (streaming) return; startCalls += 1; streaming = { isActive: () => true, updateDetails: async (text) => { detailsText = text; return true; }, updateProgress: async (text) => { progressLines.push(text); return true; } }; };",
  "const clearIdleHold = () => {};",
  "const refreshIdleHold = () => {};",
  "const buildContentText = (thinking, answer) => [answer, statusLine].filter(Boolean).join('\\n\\n');",
  "const formatProgressLine = (line) => line ? `<font color='grey'>${line}</font>` : '';",
  "const flushStreamingCardUpdate = (text) => { flushes.push(text); if (statusLine && streaming?.isActive()) streaming.updateProgress(formatProgressLine(statusLine)); };",
  "const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') + 's'; };",
  "const escapeCardHtml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');",
  "const escapeCardMarkdown = (t) => String(t ?? '').replace(/[*_\\[\\]<>]/g, '\\\\$&');",
  "const formatToolDisplayName = (label) => label === 'exec' ? '终端' : label === 'read' ? '读取' : label === 'grep' ? '搜索' : label;",
  "const normalizeToolLabel = (label) => String(label ?? '').trim().toLowerCase().replace(/[\\s-]+/g, '_');",
  "const truncateDisplayText = (t, max) => { const c = Array.from(String(t)); return c.length <= max ? String(t) : c.slice(0, max - 1).join('') + '…'; };",
  "const truncateDetailTail = (t, max) => { const c = Array.from(String(t)); return c.length <= max ? String(t) : '…' + c.slice(c.length - max + 1).join(''); };",
  "const formatToolDetailForLine = (label, detail, max = 60) => !detail ? '' : (PATH_LIKE_TOOL_LABELS.has(label) ? truncateDetailTail(detail, 40) : truncateDisplayText(detail, max));",
  waiting,
  detailsHelpers,
  record,
  aggregate,
  structured,
  "return { run: aggregateToolSummary, structured: noteStructuredToolStart, total: () => aggregatedToolTotal, status: () => statusLine, details: () => detailsText, progress: () => progressLines, flushes: () => flushes, startCalls: () => startCalls, structuredTotal: () => structuredToolTotal, lastDetail: () => lastToolDetail, setActive: (v) => { streaming = { isActive: () => v, updateDetails: async (t) => { detailsText = t; return true; }, updateProgress: async (t) => { progressLines.push(t); return true; } }; } };"
].join("\n");

const box = new Function("let statusLine = ''; " + code)();

const a = await box.run({ key: "a\0exec\0", icon: "💻", label: "exec", detail: "git status --short" });
const b = await box.run({ key: "a\0exec\0", icon: "💻", label: "exec", detail: "git status --short" });
const c = await box.run({ key: "b\0read\0src/app.ts", icon: "📖", label: "read", detail: "src/app.ts" });

ok("tool summaries aggregate", a === true && b === true && c === true);
ok("running total counts every tool", box.total() === 3);
ok("waiting status keeps the count", /^⏳ 3 个工具/.test(box.status()));
ok("waiting status shows the current tool and detail", box.status().includes("读取 src/app.ts"));
ok("progress element receives the grey status line", box.progress().length >= 3 && box.progress().every((line) => line.startsWith("<font color='grey'>⏳ ")));
ok("details start with a compact summary", box.details().startsWith("**3 个工具"));
ok("single-tool groups carry the tool name", box.details().includes("**命令 · 终端**") && box.details().includes("**文件 · 读取**"));
ok("details show the call detail", box.details().includes("- git status --short ×2") && box.details().includes("- src/app.ts"));
ok("card updates flushed", box.flushes().length >= 3);
ok("card started once by first tool", box.startCalls() === 1);

// structured path takes ownership of the turn
const s1 = await box.structured({ phase: "start", name: "exec", args: { command: "pnpm test" } });
ok("structured tool start records a tool", s1 === true && box.structuredTotal() === 1 && box.total() === 4);
ok("structured detail is captured", box.lastDetail() === "pnpm test" && box.details().includes("pnpm test"));
const before = box.total();
const s2 = await box.run({ key: "x\0exec\0", icon: "💻", label: "exec", detail: "" });
ok("text aggregation is consumed once structured events arrive", s2 === true && box.total() === before);
ok("structured start ignores non-start phases", await box.structured({ phase: "update", name: "exec", args: { command: "pnpm test" } }) === false);
ok("structured start tolerates missing args", await box.structured({ phase: "start", name: "apply_patch" }) === true);

const abortBox = new Function("let statusLine = ''; " + code)();
abortBox.setActive(false);
ok("aggregation aborts if card disappears", await abortBox.run({ key: "c\0grep\0", icon: "🔍", label: "grep", detail: "" }) === false);
ok("aborted aggregation does not count", abortBox.total() === 0);

// prewarm: static "思考中..." line until the first real output arrives
const prewarm = extractArrow(src, "applyPrewarmStatus");
const prewarmBox = new Function(`
  let statusLine = "";
  let prewarmStatusLine = "";
  let streamText = "";
  let reasoningText = "";
  let aggregatedToolTotal = 0;
  let streaming = { isActive: () => true };
  const progress = [];
  const PREWARM_STATUS_LINE = "⏳ 思考中...";
  const formatProgressLine = (line) => line ? \`<font color='grey'>\${line}</font>\` : "";
  const buildContentText = (thinking, answer) => [thinking, answer].filter(Boolean).join("\\n\\n---\\n\\n");
  const flushStreamingCardUpdate = (combined) => {
    if (prewarmStatusLine && statusLine !== prewarmStatusLine) prewarmStatusLine = "";
    if (prewarmStatusLine && String(combined ?? "").trim()) { statusLine = ""; prewarmStatusLine = ""; }
    if (streaming?.isActive()) progress.push(statusLine ? formatProgressLine(statusLine) : "\\u200B");
  };
  const params = { runtime: { log: () => {} } };
  const account = { accountId: "a" };
  ${prewarm}
  return { run: applyPrewarmStatus, status: () => statusLine, progress: () => progress, setText: (t) => { streamText = t; }, flush: flushStreamingCardUpdate };
`)();

ok("prewarm writes the static thinking line", prewarmBox.run() === true && prewarmBox.status() === "⏳ 思考中...");
ok("prewarm line is rendered grey", prewarmBox.progress().slice(-1)[0].startsWith("<font color='grey'>⏳ 思考中..."));
prewarmBox.setText("answer");
ok("prewarm is skipped once output exists", prewarmBox.run() === false);
prewarmBox.flush("answer");
ok("first output clears the prewarm line", prewarmBox.status() === "" && prewarmBox.progress().slice(-1)[0] === "\u200B");

finish("2026.11.1 aggregation/status/details");
