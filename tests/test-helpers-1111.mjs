// 2026.11.1 batch7 — parser, structured tool details, compact layout and content-only card checks.
import { loadBundle, makeCounter, extractArrow, extractConstLine } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

/** Module-level `const name = (...) => { ... };` (zero-indent closing brace). */
function extractTopArrow(name) {
  const head = `const ${name} = (`;
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`missing ${name}`);
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error(`unterminated ${name}`);
  return src.slice(start, end + 3);
}

function loadHelpers() {
  const start = src.indexOf("const TOOL_DETAIL_ARG_KEYS");
  const end = src.indexOf("var FeishuStreamingSession = class");
  if (start < 0 || end < 0) throw new Error("helper block missing");
  return new Function(`${src.slice(start, end)}
    return {
      parseBareToolLabel, parseCollapsibleToolSummary, formatToolDisplayName,
      formatElapsedDuration, detectOpenCodeFence, truncateDisplayText,
      truncateDetailTail, sanitizeToolDetail, toolDetailFromArgs, formatToolDetailForLine
    };`)();
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

// structured tool details (onToolStart args -> one-line summary)
ok("exec detail comes from the command arg", h.toolDetailFromArgs("exec", { command: "git status --short" }) === "git status --short");
ok("read detail comes from the path arg", h.toolDetailFromArgs("read", { path: "src/app.ts" }) === "src/app.ts");
ok("web_search detail comes from the query arg", h.toolDetailFromArgs("web_search", { query: "feishu cardkit" }) === "feishu cardkit");
ok("unknown tools carry no detail", h.toolDetailFromArgs("mcp_thing", { command: "x" }) === "");
ok("tools without a detail key stay empty", h.toolDetailFromArgs("apply_patch", { patch: "..." }) === "");
ok("missing args are tolerated", h.toolDetailFromArgs("exec", undefined) === "" && h.toolDetailFromArgs("exec", null) === "");
ok("secrets are redacted", h.toolDetailFromArgs("exec", { command: "curl -H 'Authorization: Bearer abc123' x" }).includes("***")
  && !h.toolDetailFromArgs("exec", { command: "curl -H 'Authorization: Bearer abc123' x" }).includes("abc123"));
ok("detail length is capped", Array.from(h.toolDetailFromArgs("exec", { command: "x".repeat(300) })).length <= 80);
ok("command detail truncates the head", h.formatToolDetailForLine("exec", "a".repeat(100)).endsWith("…"));
ok("path detail truncates the tail", h.formatToolDetailForLine("read", "/a/b/c/" + "d".repeat(80)).startsWith("…"));
ok("short detail passes through unchanged", h.formatToolDetailForLine("exec", "pnpm test") === "pnpm test");

const waiting = extractArrow(src, "buildWaitingLine");
const final = extractArrow(src, "buildFinalStatusLine");
const progressLine = extractConstLine(src, "formatProgressLine");
const detailsStart = src.indexOf("const TOOL_GROUP_ORDER");
const detailsEnd = src.indexOf("const buildHeldStatusLine");
if (detailsStart < 0 || detailsEnd < 0) throw new Error("details helper block missing");
const detailsHelpers = src.slice(detailsStart, detailsEnd);

const sandbox = new Function(`
  let aggregatedToolTotal = 3;
  let lastToolLabel = "exec";
  let lastToolDetail = "git status --short";
  let toolPhaseStartedAt = Date.now() - 65000;
  let cardStartedAt = Date.now() - 65000;
  let toolEventsDropped = 0;
  let toolEvents = [
    { key: "a", icon: "💻", label: "exec", detail: "git status --short", count: 2 },
    { key: "b", icon: "📖", label: "read", detail: "src/app.ts", count: 1 }
  ];
  const TOOL_DETAIL_PROGRESS_MAX_CHARS = 32;
  const TOOL_DETAIL_COMMAND_MAX_CHARS = 60;
  const TOOL_DETAIL_PATH_MAX_CHARS = 40;
  const PATH_LIKE_TOOL_LABELS = new Set(["read", "write", "edit", "apply_patch", "patch", "ls", "image", "view_image", "glob"]);
  const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s"; };
  const escapeCardHtml = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeCardMarkdown = (t) => String(t ?? "").replace(/[*_\\[\\]<>]/g, "\\\\$&");
  const formatToolDisplayName = (label) => label === "exec" ? "终端" : label === "read" ? "读取" : label;
  const normalizeToolLabel = (label) => String(label ?? "").trim().toLowerCase().replace(/[\\s-]+/g, "_");
  ${extractTopArrow("truncateDisplayText")}
  ${extractTopArrow("truncateDetailTail")}
  ${extractTopArrow("formatToolDetailForLine")}
  const buildToolDoneLine = (total) => ["\\u2705 ", total, " 个工具 · 生成回复中…"].join("");
  ${waiting}
  ${final}
  ${progressLine}
  ${detailsHelpers}
  return { waiting: buildWaitingLine(3), done: buildToolDoneLine(3), final: buildFinalStatusLine(), progress: formatProgressLine(buildFinalStatusLine()), details: buildDetailsContent(), element: buildDetailsElement() };
`)();

ok("waiting line shows the count", /^⏳ 3 个工具/.test(sandbox.waiting));
ok("waiting line shows elapsed time", sandbox.waiting.includes("1m05s"));
ok("waiting line shows the current tool and its detail", sandbox.waiting.includes("终端 git status --short"));
ok("waiting line uses middot separators", sandbox.waiting.split(" · ").length >= 3);
ok("tool done line shows count", sandbox.done.includes("3 个工具") && sandbox.done.includes("生成回复中"));
ok("final line shows completion, tools and duration", sandbox.final.startsWith("✅ 完成") && sandbox.final.includes("已执行 3 个工具") && sandbox.final.includes("1m05s"));
ok("final line is wrapped as grey progress text", sandbox.progress.startsWith("<font color='grey'>") && sandbox.progress.endsWith("</font>"));
ok("details panel starts with a compact summary line", sandbox.details.startsWith("**3 个工具 · 1m05s**"));
ok("single-tool group carries the tool name", sandbox.details.includes("**命令 · 终端**") && sandbox.details.includes("**文件 · 读取**"));
ok("group rows show the detail without repeating the tool name", sandbox.details.includes("- git status --short ×2") && sandbox.details.includes("- src/app.ts"));
ok("details element is a markdown body", sandbox.element.tag === "markdown" && sandbox.element.element_id === "detailspanel_body" && sandbox.element.content === sandbox.details);

// dropped-event folding
const droppedSandbox = new Function(`
  let aggregatedToolTotal = 25;
  let lastToolLabel = "exec";
  let lastToolDetail = "";
  let toolPhaseStartedAt = Date.now();
  let cardStartedAt = Date.now();
  let toolEventsDropped = 5;
  let toolEvents = [{ key: "a", icon: "💻", label: "exec", detail: "", count: 20 }];
  const TOOL_DETAIL_COMMAND_MAX_CHARS = 60;
  const TOOL_DETAIL_PATH_MAX_CHARS = 40;
  const PATH_LIKE_TOOL_LABELS = new Set(["read"]);
  const formatElapsedDuration = () => "12s";
  const escapeCardMarkdown = (t) => String(t ?? "");
  const formatToolDisplayName = (label) => label === "exec" ? "终端" : label;
  const normalizeToolLabel = (label) => String(label ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const truncateDisplayText = (t) => t;
  const truncateDetailTail = (t) => t;
  const formatToolDetailForLine = () => "";
  const buildWaitingLine = () => "";
  const buildFinalStatusLine = () => "";
  const formatProgressLine = () => "";
  ${detailsHelpers}
  return buildDetailsContent();
`)();
ok("dropped tool events are disclosed", droppedSandbox.includes("另有 5 个较早调用"));

// Structural checks: the implementation must stay content-only and use the new layout.
ok("no legacy status element", !src.includes('element_id: "status"'));
ok("no legacy status API", !src.includes("writeStatusContent") && !src.includes("deleteStatusElement") && !src.includes("statusElementEnabled"));
ok("card has content, progress, divider and details panel", src.includes('element_id: "content"') && src.includes('element_id: "progress"') && src.includes('element_id: "divider"') && src.includes('element_id: "detailspanel"') && src.includes('element_id: "detailspanel_body"'));
ok("final completion line wired into close", src.includes("statusLine = finalStatusLine;"));
ok("card content writes retried", src.includes("CARD_WRITE_RETRY_MAX_ATTEMPTS") && src.includes("isRetryableCardKitError"));
ok("details element writes serialized", src.includes("async writeElementContent(elementId, text)"));
ok("final details use an element replace", src.includes("buildDetailsElement") && src.includes('putElementPayload("detailspanel_body", options.details, "replace")'));
ok("structured tool start is wired", src.includes("onToolStart: previewStreamingEnabled ?") && src.includes("noteStructuredToolStart(payload)"));
ok("commentary is routed to the progress line", src.includes('payload.phase === "commentary"') && src.includes("noteCommentaryLine("));

finish("2026.11.1 helpers/content-only");
