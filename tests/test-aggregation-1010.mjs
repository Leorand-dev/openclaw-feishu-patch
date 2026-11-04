// 2026.10.10 batch5 — aggregation state, status line and details content.
import { loadBundle, makeCounter, extractArrow, extractAsyncArrow } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const waiting = extractArrow(src, "buildWaitingLine");
const detailsFn = extractArrow(src, "buildDetailsContent");
const aggregate = extractAsyncArrow(src, "aggregateToolSummary");

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
  "const flushes = [];",
  "let startCalls = 0;",
  "let streamingStartPromise = null;",
  "let streaming = null;",
  "const startStreaming = () => { if (streaming) return; startCalls += 1; streaming = { isActive: () => true, updateDetails: async (text) => { detailsText = text; return true; } }; };",
  "const clearIdleHold = () => {};",
  "const refreshIdleHold = () => {};",
  "const buildCombinedStreamText = (thinking, answer) => [answer, statusLine].filter(Boolean).join('\\n\\n');",
  "const flushStreamingCardUpdate = (text) => { flushes.push(text); };",
  "const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') + 's'; };",
  "const escapeCardHtml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');",
  "const escapeCardMarkdown = (t) => String(t ?? '').replace(/[*_\\[\\]<>]/g, '\\\\$&');",
  "const formatToolDisplayName = (label) => label === 'exec' ? '终端' : label === 'read' ? '读取' : label;",
  waiting,
  detailsFn,
  aggregate,
  "return { run: aggregateToolSummary, total: () => aggregatedToolTotal, status: () => statusLine, details: () => detailsText, flushes: () => flushes, startCalls: () => startCalls, setActive: (v) => { streaming = { isActive: () => v, updateDetails: async (t) => { detailsText = t; return true; } }; } };"
].join("\n");

const box = new Function("let statusLine = ''; " + code)();

const a = await box.run({ key: "a\0exec", icon: "💻", label: "exec" });
const b = await box.run({ key: "a\0exec", icon: "💻", label: "exec" });
const c = await box.run({ key: "b\0read", icon: "📖", label: "read" });

ok("tool summaries aggregate", a === true && b === true && c === true);
ok("running total counts every tool", box.total() === 3);
ok("waiting status shows total", box.status().includes("已执行 3 个工具"));
ok("waiting status shows latest tool", box.status().includes("读取"));
ok("details groups repeated tool", box.details().includes("终端") && box.details().includes("×2"));
ok("details includes new tool", box.details().includes("读取"));
ok("card updates flushed", box.flushes().length >= 3);
ok("card started once by first tool", box.startCalls() === 1);

box.setActive(false);
ok("aggregation aborts if card disappears", await box.run({ key: "c\0grep", icon: "🔍", label: "grep" }) === false);
ok("aborted aggregation does not count", box.total() === 3);

finish("2026.10.10 aggregation/status/details");
