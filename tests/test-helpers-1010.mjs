// 2026.10.10 batch5 — parser, display helpers and content-only status checks.
import { loadBundle, makeCounter, extractArrow } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

function loadHelpers() {
  const start = src.indexOf("const TOOL_SUMMARY_MAX_CHARS");
  const end = src.indexOf("var FeishuStreamingSession = class");
  if (start < 0 || end < 0) throw new Error("helper block missing");
  return new Function(`${src.slice(start, end)}
    return { parseBareToolLabel, parseCollapsibleToolSummary, formatToolDisplayName, formatElapsedDuration, detectOpenCodeFence, truncateDisplayText };`)();
}

const h = loadHelpers();

const bare = h.parseBareToolLabel({ text: "Exec", mediaUrls: undefined }, { kind: "tool" });
ok("bare Exec aggregates", bare && bare.label === "exec" && bare.icon === "💻");
const read = h.parseBareToolLabel({ text: "Read: `from /tmp/a`", mediaUrls: undefined }, { kind: "tool" });
ok("label with detail aggregates", read && read.label === "read");
const emoji = h.parseCollapsibleToolSummary({ text: "🛠️ Exec", mediaUrls: undefined }, { kind: "tool" });
ok("emoji tool summary aggregates", emoji && /exec/i.test(emoji.label));
ok("narration is not a tool", h.parseBareToolLabel({ text: "💬 hi", mediaUrls: undefined }, { kind: "tool" }) === undefined);
ok("tool errors are not aggregated", h.parseBareToolLabel({ text: "Exec", mediaUrls: undefined, isError: true }, { kind: "tool" }) === undefined);
ok("media payloads are not aggregated", h.parseBareToolLabel({ text: "Exec", mediaUrls: ["x"] }, { kind: "tool" }) === undefined);
ok("non-tool kinds are not aggregated", h.parseBareToolLabel({ text: "Exec", mediaUrls: undefined }, { kind: "final" }) === undefined);
ok("display names are localized", h.formatToolDisplayName("exec") === "终端" && h.formatToolDisplayName("web_fetch") === "网页抓取");
ok("elapsed formatting", h.formatElapsedDuration(0) === "0s" && h.formatElapsedDuration(65000) === "1m05s");
ok("unclosed fences detected", h.detectOpenCodeFence("```js\nx") === "`");
ok("closed fences do not leak", h.detectOpenCodeFence("```js\nx\n```") === "");

const waiting = extractArrow(src, "buildWaitingLine");
const final = extractArrow(src, "buildFinalStatusLine");
const details = extractArrow(src, "buildDetailsContent");
const sandbox = new Function(`
  let aggregatedToolTotal = 3;
  let lastToolLabel = "exec";
  let toolPhaseStartedAt = Date.now() - 65000;
  let cardStartedAt = Date.now() - 65000;
  let toolEvents = [
    { key: "a", icon: "💻", label: "exec", count: 2 },
    { key: "b", icon: "📖", label: "read", count: 1 }
  ];
  const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s"; };
  const escapeCardHtml = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeCardMarkdown = (t) => String(t ?? "").replace(/[*_\\[\\]<>]/g, "\\\\$&");
  const formatToolDisplayName = (label) => label === "exec" ? "终端" : label === "read" ? "读取" : label;
  const buildToolDoneLine = (total) => ["\u2705 已执行 ", total, " 个工具 · 生成回复中…"].join("");
  ${waiting}
  ${final}
  ${details}
  return { waiting: buildWaitingLine(3), done: buildToolDoneLine(3), final: buildFinalStatusLine(), details: buildDetailsContent() };
`)();

ok("waiting line shows count and latest tool", sandbox.waiting.includes("已执行 3 个工具") && sandbox.waiting.includes("终端"));
ok("tool done line shows count", sandbox.done.includes("已执行 3 个工具") && sandbox.done.includes("生成回复中"));
ok("final line shows completion, tools and duration", sandbox.final.startsWith("✅ 完成") && sandbox.final.includes("已执行 3 个工具") && sandbox.final.includes("1m05s"));
ok("details panel lists grouped tools", sandbox.details.includes("终端") && sandbox.details.includes("读取") && sandbox.details.includes("×2"));

// Structural checks: the new implementation must be content-only.
ok("no legacy status element", !src.includes('element_id: "status"'));
ok("no legacy status API", !src.includes("writeStatusContent") && !src.includes("deleteStatusElement") && !src.includes("statusElementEnabled"));
ok("content card plus collapsible details", src.includes('element_id: "detailspanel"') && src.includes('element_id: "detailspanel_body"'));
ok("final completion line wired into close", src.includes("statusLine = finalStatusLine;"));
ok("card content writes retried", src.includes("CARD_WRITE_RETRY_MAX_ATTEMPTS") && src.includes("isRetryableCardKitError"));
ok("details element writes serialized", src.includes("async writeElementContent(elementId, text)"));

finish("2026.10.10 helpers/content-only");
