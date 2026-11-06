// 2026.11.1 batch6 — aggregation state, short status line, grouped details, progress element.
import { loadBundle, makeCounter, extractArrow, extractAsyncArrow } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const waiting = extractArrow(src, "buildWaitingLine");
const aggregate = extractAsyncArrow(src, "aggregateToolSummary");
const detailsStart = src.indexOf("const TOOL_GROUP_ORDER");
const detailsEnd = src.indexOf("const buildDetailsColumns");
if (detailsStart < 0 || detailsEnd < 0) throw new Error("details helpers missing");
const detailsHelpers = src.slice(detailsStart, detailsEnd);

const code = [
  "let previewStreamingEnabled = true;",
  "const renderMode = 'card';",
  "let aggregatedToolTotal = 0;",
  "let lastToolLabel = '';",
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
  "const startStreaming = () => { if (streaming) return; startCalls += 1; streaming = { isActive: () => true, updateDetails: async (text) => { detailsText = text; return true; }, updateProgress: async (text) => { progressLines.push(text); return true; } }; };",
  "const clearIdleHold = () => {};",
  "const refreshIdleHold = () => {};",
  "const buildCombinedStreamText = (thinking, answer) => [answer, statusLine].filter(Boolean).join('\\n\\n');",
  "const formatProgressLine = (line) => line ? `<font color='grey'>${line}</font>` : '';",
  "const flushStreamingCardUpdate = (text) => { flushes.push(text); if (statusLine && streaming?.isActive()) streaming.updateProgress(formatProgressLine(statusLine)); };",
  "const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') + 's'; };",
  "const escapeCardHtml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');",
  "const escapeCardMarkdown = (t) => String(t ?? '').replace(/[*_\\[\\]<>]/g, '\\\\$&');",
  "const formatToolDisplayName = (label) => label === 'exec' ? '终端' : label === 'read' ? '读取' : label === 'grep' ? '搜索' : label;",
  "const normalizeToolLabel = (label) => String(label ?? '').trim().toLowerCase().replace(/[\\s-]+/g, '_');",
  waiting,
  detailsHelpers,
  aggregate,
  "return { run: aggregateToolSummary, total: () => aggregatedToolTotal, status: () => statusLine, details: () => detailsText, progress: () => progressLines, flushes: () => flushes, startCalls: () => startCalls, setActive: (v) => { streaming = { isActive: () => v, updateDetails: async (t) => { detailsText = t; return true; }, updateProgress: async (t) => { progressLines.push(t); return true; } }; } };"
].join("\n");

const box = new Function("let statusLine = ''; " + code)();

const a = await box.run({ key: "a\0exec", icon: "💻", label: "exec" });
const b = await box.run({ key: "a\0exec", icon: "💻", label: "exec" });
const c = await box.run({ key: "b\0read", icon: "📖", label: "read" });

ok("tool summaries aggregate", a === true && b === true && c === true);
ok("running total counts every tool", box.total() === 3);
ok("waiting status uses the short form", /^⏳ 3 个工具/.test(box.status()) && box.status().includes("个工具"));
ok("waiting status no longer carries the latest tool", !box.status().includes("最近"));
ok("progress element receives the grey status line", box.progress().length >= 3 && box.progress().every((line) => line.startsWith("<font color='grey'>⏳ ")) && box.progress().slice(-1)[0].includes("⏳ 3 个工具"));
ok("details start with a summary line", box.details().startsWith("**共 3 个工具"));
ok("details group tools by category", box.details().includes("**命令**") && box.details().includes("**文件**"));
ok("details group repeated tool", box.details().includes("终端") && box.details().includes("×2"));
ok("details include the new tool", box.details().includes("读取"));
ok("card updates flushed", box.flushes().length >= 3);
ok("card started once by first tool", box.startCalls() === 1);

box.setActive(false);
ok("aggregation aborts if card disappears", await box.run({ key: "c\0grep", icon: "🔍", label: "grep" }) === false);
ok("aborted aggregation does not count", box.total() === 3);

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
  const buildCombinedStreamText = (thinking, answer) => [thinking, answer].filter(Boolean).join("\\n\\n---\\n\\n");
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
