// 2026.11.1 batch7 — parser, structured tool details, compact layout and content-only card checks.
import { loadBundle, makeCounter, extractArrow, extractConstLine } from "./_harness.mjs";

const src = loadBundle();
const hasV4 = src.includes("const LAYOUT_V4 = true;");
const hasV41 = src.includes("lastContentWriteFailureAt");
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
      truncateDetailTail, sanitizeToolDetail, toolDetailFromArgs, formatToolDetailForLine, redactSecrets
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
ok("space-separated secret flags are redacted", (() => {
  const detail = h.sanitizeToolDetail("mysql --password hunter2 appdb");
  return detail.includes("--password ***") && !detail.includes("hunter2");
})());
ok("provider token shapes are redacted", (() => {
  const detail = h.sanitizeToolDetail("export sk-abcdefghijklmnopqrstu");
  return !detail.includes("abcdefghijklmnopqrstu");
})());
ok("commentary text is redacted too", (() => {
  const text = h.redactSecrets("config token=abc123 applied");
  return text.includes("***") && !text.includes("abc123");
})());
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
  const hasV4 = ${hasV4};
  let toolPhaseCompleted = false;
  const buildToolDoneLine = (total) => hasV4 ? "\u270D\uFE0F 生成回复中 · " + total + " 个工具" : ["\u2705 ", total, " 个工具 · 生成回复中…"].join("");
  ${waiting}
  ${final}
  ${progressLine}
  ${detailsHelpers}
  return { waiting: buildWaitingLine(3), done: buildToolDoneLine(3), final: buildFinalStatusLine(), progress: formatProgressLine(buildFinalStatusLine()), details: hasV4 ? buildDetailsContent(lastToolDetail) : buildDetailsContent(), element: hasV4 ? buildDetailsElement(lastToolDetail) : buildDetailsElement() };
`)();

ok("waiting line shows the count", hasV4 ? /^🔧 3 个工具/.test(sandbox.waiting) : /^⏳ 3 个工具/.test(sandbox.waiting));
ok("waiting line shows elapsed time", sandbox.waiting.includes("1m05s"));
ok("waiting line keeps the current tool out of the status (v4) or shows it (v3)", hasV4 ? !sandbox.waiting.includes("git status") : sandbox.waiting.includes("终端 git status --short"));
ok("waiting line uses middot separators", hasV4 ? sandbox.waiting.split(" · ").length === 2 : sandbox.waiting.split(" · ").length >= 3);
ok("tool done line shows count", sandbox.done.includes("3 个工具") && sandbox.done.includes("生成回复中"));
ok("final line shows completion, tools and duration", sandbox.final.startsWith("✅ 完成") && (hasV4 ? sandbox.final.includes("3 个工具") && !sandbox.final.includes("已执行") : sandbox.final.includes("已执行 3 个工具")) && sandbox.final.includes("1m05s"));
ok("final line is wrapped as grey progress text", sandbox.progress.startsWith("<font color='grey'>") && sandbox.progress.endsWith("</font>"));
ok("details panel starts with a live row (v4) or a compact summary (v3)", hasV4 ? sandbox.details.startsWith("**🔧 执行中**") && !sandbox.details.includes("3 个工具 · 1m05s") : sandbox.details.startsWith("**3 个工具 · 1m05s**"));
ok("single-tool group carries the tool name", sandbox.details.includes("**命令 · 终端**") && sandbox.details.includes("**文件 · 读取**"));
ok("group rows show the detail without repeating the tool name", hasV4 ? sandbox.details.includes("- `git status --short` ×2") && sandbox.details.includes("- `src/app.ts`") : sandbox.details.includes("- git status --short ×2") && sandbox.details.includes("- src/app.ts"));
ok("details element matches the build's card contract", hasV4 ? sandbox.element.tag === "collapsible_panel" && sandbox.element.element_id === "detailspanel" && String(sandbox.element.header?.title?.content).includes("过程记录 · 3") && sandbox.element.elements?.[0]?.content === sandbox.details : sandbox.element.tag === "markdown" && sandbox.element.element_id === "detailspanel_body" && sandbox.element.content === sandbox.details);

// dropped-event folding
const droppedSandbox = new Function(`
  let aggregatedToolTotal = 25;
  let lastToolLabel = "exec";
  let lastToolDetail = "";
  let toolPhaseStartedAt = Date.now();
  let cardStartedAt = Date.now();
  let toolEventsDropped = 5;
  let toolPhaseCompleted = false;
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
ok("dropped tool events are disclosed", droppedSandbox.includes(hasV41 ? "另有 5 次较早调用" : "另有 5 个较早调用"));

// Structural checks: the implementation must stay content-only and use the new layout.
ok("no legacy status element", !src.includes('element_id: "status"'));
ok("no legacy status API", !src.includes("writeStatusContent") && !src.includes("deleteStatusElement") && !src.includes("statusElementEnabled"));
ok("card has content, progress, divider and details panel", src.includes('element_id: "content"') && src.includes('element_id: "progress"') && src.includes('element_id: "divider"') && src.includes('element_id: "detailspanel"') && src.includes('element_id: "detailspanel_body"'));
ok("final completion line wired into close", hasV4 ? src.includes("heldClose ? formatProgressLine(finalStatusLine) : formatDoneLine(finalStatusLine)") : src.includes("statusLine: formatProgressLine(finalStatusLine)"));
ok("card content writes retried", src.includes("CARD_WRITE_RETRY_MAX_ATTEMPTS") && src.includes("isRetryableCardKitError"));
ok("details element writes serialized", src.includes("async writeElementContent(elementId, text)"));
ok("final details use an element replace", src.includes("buildDetailsElement") && (hasV4 ? src.includes('putElementPayload("detailspanel", options.detailsElement, "replace")') : src.includes('putElementPayload("detailspanel_body", options.details, "replace")')));
ok("structured tool start is wired", src.includes("onToolStart: previewStreamingEnabled ?") && src.includes("noteStructuredToolStart(payload)"));
ok("commentary is routed to the progress line", src.includes('payload.phase === "commentary"') && src.includes("noteCommentaryLine("));

// ---- v4.1 (2026.11.10 audit 5.8): redaction coverage and unified tool lanes ----
if (hasV41) {
  const bashRow = h.parseBareToolLabel({ text: "Bash: npm test", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.1 bare labels keep their detail", bashRow?.detail === "npm test");
  ok("v4.1 bare label keys share the structured format",
    bashRow?.key === `${bashRow.icon}\u0000bash\u0000npm test` && bashRow?.key.startsWith(`${bashRow.icon}\u0000`));
  const collapsible = h.parseCollapsibleToolSummary({ text: "\u{1F6E0}\uFE0F Bash: npm test", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.1 collapsible summaries normalize the label and keep detail",
    collapsible?.label === "bash" && collapsible?.detail === "npm test" && collapsible?.key === `${collapsible.icon}\u0000bash\u0000npm test`);
  const redactionVectors = [
    ["AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG", "wJalrXUtnFEMI"],
    ["AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", "AKIAIOSFODNN7EXAMPLE"],
    ["OPENAI_SECRET_KEY=abcDEF1234567890XYZ", "abcDEF1234567890XYZ"],
    ["--db-password hunter2", "hunter2"],
    ["--db-password=hunter2", "hunter2"],
    ["--client-secret abcdef123456", "abcdef123456"],
    ["--access-token abcdef123456", "abcdef123456"],
    ["--access-key=AKIAIOSFODNN7EXAMPLE", "AKIAIOSFODNN7EXAMPLE"],
    ["--secret-key=abcdef0123456789", "abcdef0123456789"],
    ['{"api_key":"AKIAIOSFODNN7EXAMPLE"}', "AKIAIOSFODNN7EXAMPLE"],
    ['{"password": "p@ss word"}', "p@ss word"],
    ['{"token":"abcdef123456"}', "abcdef123456"],
    ['{"client_secret":"abcdef123456"}', "abcdef123456"],
    ['psql "postgres://appuser:s3cr3tpw@db.host:5432/prod"', "s3cr3tpw"],
    ["git clone https://oauth2:glpat-abc123def456@gitlab.com/x.git", "glpat-abc123def456"],
    ["Authorization: Basic dXNlcjpwYXNzd29yZA==", "dXNlcjpwYXNzd29yZA"],
    ["Authorization: Token abc123def456", "abc123def456"],
    ['mysql --user root --password "my secret"', "my secret"],
    ['--password="my secret"', "my secret"],
    ['password: "my secret"', "my secret"],
    ["echo SK-ABCDEFGHIJKLMNOPQRST", "SK-ABCDEFGHIJKLMNOPQRST"],
    ["echo sk-abc123", "sk-abc123"],
    ["echo sk_abc.def/ghi+jkl=", "sk_abc.def/ghi+jkl="],
    ["echo ghs_abcdefghijklmnopqrstuvwxyz012345", "ghs_abcdefghijklmnopqrstuvwxyz012345"],
    ["echo github_pat_11ABCDE0abcdefghijklmnopqrstuvwxyz", "github_pat_11ABCDE0abcdefghijklmnopqrstuvwxyz"],
    ["echo AKIAIOSFODNN7EXAMPLE", "AKIAIOSFODNN7EXAMPLE"],
    ["echo glpat-AbCdEfGhIjKlMnOpQrSt", "glpat-AbCdEfGhIjKlMnOpQrSt"],
    ["Cookie: session=abc123def456ghi", "abc123def456ghi"],
    ["?signature=abcdef0123456789abcdef&x=1", "abcdef0123456789abcdef"],
    ["export DB_PASS=superSecret123", "superSecret123"],
    ["密码：hunter2", "hunter2"],
    ["X-AWS-Secret-Access-Key: abc123", "abc123"]
  ];
  const redactionFailures = redactionVectors.filter(([vector, leak]) => h.redactSecrets(vector).includes(leak));
  for (const [vector, leak] of redactionFailures) console.log(`   [leak] ${JSON.stringify(vector)} still contains ${JSON.stringify(leak)}`);
  ok("v4.1 redaction vector table (31 cases) has no leaks", redactionFailures.length === 0);
  ok("v4.1 redacts url userinfo", h.redactSecrets("curl https://admin:hunter2@x/y").includes("[redacted]@"));
  ok("v4.1 over-redaction of url token params stays accepted", h.redactSecrets("https://x/?token=abc&z=1").includes("***"));
  ok("v4.2 upstream session tools carry args detail",
    h.toolDetailFromArgs("sessions_spawn", { label: "fix login" }) === "fix login"
    && h.toolDetailFromArgs("memory_get", { path: "notes/goals" }) === "notes/goals"
    && h.toolDetailFromArgs("code_execution", { task: "run tests" }) === "run tests"
    && h.toolDetailFromArgs("conversations_send", { conversationRef: "c9" }) === "c9");
  const commandRow = h.parseBareToolLabel({ text: "Command: ls -la", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.2 command aliases to exec", commandRow?.label === "exec" && commandRow?.detail === "ls -la");
  const orderSandbox = new Function(`
    let aggregatedToolTotal = 3;
    let lastToolLabel = "web_search";
    let lastToolDetail = "";
    let toolPhaseStartedAt = Date.now();
    let cardStartedAt = Date.now();
    let toolEventsDropped = 0;
    let toolPhaseCompleted = false;
    let toolEvents = [
      { key: "w", icon: "\u{1F50D}", label: "web_search", detail: "", count: 1 },
      { key: "e", icon: "\u{1F4BB}", label: "exec", detail: "ls", count: 1 },
      { key: "s", icon: "\u{1F916}", label: "sessions_spawn", detail: "fix", count: 1 }
    ];
    const TOOL_DETAIL_PROGRESS_MAX_CHARS = 32;
    const TOOL_DETAIL_COMMAND_MAX_CHARS = 60;
    const TOOL_DETAIL_PATH_MAX_CHARS = 40;
    const PATH_LIKE_TOOL_LABELS = new Set(["read"]);
    const formatElapsedDuration = () => "1s";
    const escapeCardHtml = (t) => String(t ?? "");
    const escapeCardMarkdown = (t) => String(t ?? "");
    const formatToolDisplayName = (label) => label;
    const normalizeToolLabel = (label) => String(label ?? "").trim().toLowerCase().replace(/[\\s-]+/g, "_");
    const truncateDisplayText = (t) => t;
    const truncateDetailTail = (t) => t;
    const formatToolDetailForLine = (label, detail) => detail;
    const buildWaitingLine = () => "";
    const buildFinalStatusLine = () => "";
    const formatProgressLine = () => "";
    ${detailsHelpers}
    return buildDetailsContent("");
  `)();
  const orderText = String(orderSandbox);
  ok("v4.2 groups follow the fixed taxonomy order",
    orderText.split("\n")[0].startsWith("**命令") && orderText.indexOf("**命令") < orderText.indexOf("**网络") && orderText.indexOf("**网络") < orderText.indexOf("**会话"));
  ok("v4.2 upstream session names group under 会话", orderText.includes("**会话 · sessions_spawn**"));
  ok("v4.2 the dropped note is no longer a list item",
    !droppedSandbox.includes("- \u2026 另有") && droppedSandbox.includes("_\u2026 另有 5 次较早调用_"));
  const knowledgeRemember = h.parseBareToolLabel({ text: "Knowledge Remember", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.3 knowledge tools are recognized",
    knowledgeRemember?.label === "knowledge_remember" && knowledgeRemember?.icon === "\u{1F9E0}"
    && h.formatToolDisplayName("knowledge_record") === "知识记录");
  const knowledgeRecord = h.parseBareToolLabel({ text: "Knowledge Record: session goal", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.3 knowledge rows keep their detail", knowledgeRecord?.label === "knowledge_record" && knowledgeRecord?.detail === "session goal");
  const unknownTool = h.parseBareToolLabel({ text: "Widget Polish: shine", mediaUrls: undefined }, { kind: "tool" });
  ok("v4.3 title-shaped unknown tools join the panel instead of leaking",
    unknownTool?.label === "widget_polish" && unknownTool?.detail === "shine");
  ok("v4.3 lowercase or wordy sentences are not tool rows",
    h.parseBareToolLabel({ text: "please wait while the tool runs", mediaUrls: undefined }, { kind: "tool" }) === undefined
    && h.parseBareToolLabel({ text: "I will now go and run the thing", mediaUrls: undefined }, { kind: "tool" }) === undefined);
}

finish("2026.11.1 helpers/content-only");
