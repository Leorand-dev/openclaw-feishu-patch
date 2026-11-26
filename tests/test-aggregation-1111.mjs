// 2026.11.1 batch7 — aggregation state, structured tool starts, compact details, prewarm.
import { loadBundle, makeCounter, extractArrow, extractAsyncArrow } from "./_harness.mjs";

const src = loadBundle();
const hasV4 = src.includes("const LAYOUT_V4 = true;");
const hasV41 = src.includes("lastContentWriteFailureAt");
const hasV46 = src.includes("syncBufferedToolStateToCard");
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
  `const hasV4 = ${hasV4};`,
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
ok("waiting status keeps the count", hasV4 ? /^🔧 3 个工具/.test(box.status()) : /^⏳ 3 个工具/.test(box.status()));
ok("waiting status keeps the current tool out (v4) or shows it (v3)", hasV4 ? !box.status().includes("读取 src/app.ts") : box.status().includes("读取 src/app.ts"));
ok("progress element receives the grey status line", box.progress().length >= 3 && box.progress().every((line) => line.startsWith(hasV4 ? "<font color='grey'>🔧 " : "<font color='grey'>⏳ ")));
ok("details start with a live row (v4) or a compact summary (v3)", hasV4 ? box.details().startsWith("**🔧 执行中**") : box.details().startsWith("**3 个工具"));
ok("single-tool groups carry the tool name", box.details().includes("**命令 · 终端**") && box.details().includes("**文件 · 读取**"));
ok("details show the call detail", hasV4 ? box.details().includes("- `git status --short` ×2") && box.details().includes("- `src/app.ts`") : box.details().includes("- git status --short ×2") && box.details().includes("- src/app.ts"));
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
ok("a tool row with no open card is claimed by v4.6 (dropped by v3)",
  await abortBox.run({ key: "c\0grep\0", icon: "🔍", label: "grep", detail: "" }) === (hasV46 ? true : false));
ok("a claimed row is counted but not rendered until a card opens",
  abortBox.total() === (hasV46 ? 1 : 0) && abortBox.details() === "");

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

// ---- v4.4/v4.5: the prewarm line rotates per turn -------------------------
if (hasV41) {
  ok("v4.5 prewarm combines a random icon and a random text per turn",
    src.includes("const PREWARM_STATUS_ICONS = [") && src.includes("const PREWARM_STATUS_TEXTS = [")
    && src.includes("PREWARM_STATUS_ICONS[Math.floor(Math.random() * PREWARM_STATUS_ICONS.length)]")
    && src.includes("PREWARM_STATUS_TEXTS[Math.floor(Math.random() * PREWARM_STATUS_TEXTS.length)]"));
  ok("v4.5 the prewarm sets keep the classic combo and add variants",
    src.includes('"\\u23F3"') && src.includes('"想一想..."') && src.includes('"组织答案中..."')
    && src.includes('"\\u{1F914}"') && src.includes('"\\u2615"') && src.includes('"\\u{1F52E}"'));
}

// ---- v4.1 (2026.11.10 audit 5.1): the guard must see an in-flight structured record ----
if (hasV41) {
  const raceBox = new Function("let statusLine = ''; " + code)();
  const inFlight = raceBox.structured({ phase: "start", name: "exec", args: { command: "ls -la" } });
  const summaryDuringFlight = await raceBox.run({ key: "\u{1F4BB}\u0000exec\u0000", icon: "\u{1F4BB}", label: "exec", detail: "" });
  await inFlight;
  ok("v4.1 a summary arriving while the structured record is in flight is suppressed",
    summaryDuringFlight === true && raceBox.total() === 1 && raceBox.structuredTotal() === 1);
  ok("v4.1 the suppressed summary leaves a single row", raceBox.details().includes("ls -la") && !raceBox.details().includes("×2"));
  ok("v4.2 the live row no longer echoes the running command", raceBox.details().split("\n")[0] === "**🔧 执行中**");

  const rollbackBox = new Function("let statusLine = ''; " + code)();
  rollbackBox.setActive(false);
  ok("v4.6 a structured start without a card is buffered, not dropped",
    (await rollbackBox.structured({ phase: "start", name: "exec", args: { command: "x" } })) === true
    && rollbackBox.structuredTotal() === 1 && rollbackBox.total() === 1);
  rollbackBox.setActive(true);
  ok("v4.6 the buffered row still owns the turn once a card opens",
    (await rollbackBox.run({ key: "\u{1F4BB}\u0000exec\u0000x", icon: "\u{1F4BB}", label: "exec", detail: "x" })) === true
    && rollbackBox.total() === 1);
  ok("v4.6 core tool-progress messages are suppressed while the card aggregates",
    src.includes("suppressToolProgressMessages: previewStreamingEnabled ? true : void 0"));
  ok("v4.7 the structured tool lane stays on while the text lane is hidden",
    src.includes("suppressDefaultToolProgressMessages: previewStreamingEnabled ? true : void 0")
    && src.includes("allowToolLifecycleWhenProgressHidden: previewStreamingEnabled ? true : void 0"));
  ok("v4.6 a card that opens later replays the buffered tool state",
    src.includes("const syncBufferedToolStateToCard = async () => {")
    && src.includes("if (aggregatedToolTotal > 0) await syncBufferedToolStateToCard();"));
}

finish("2026.11.1 aggregation/status/details");
