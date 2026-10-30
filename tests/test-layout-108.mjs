// Layout pass: merged grey status row, tool icons, styled timeline, stats panel
// title, pagination index in the status line, and the transient error notice.
import { loadBundle, extractArrow, extractIconMap, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();
const panelBodyMode = src.includes("buildPanelBody");
const extractFunction = (name) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function: ${name}`);
  const end = src.indexOf("\n}", start);
  if (end < 0) throw new Error(`unterminated function: ${name}`);
  return src.slice(start, end + 2);
};

// --- 1) status and activity row merged -------------------------------------
ok("separate activity element removed", !src.includes('element_id: "activity"') && !src.includes("buildActivityText"));
ok(
  "status merges phase with the latest narration",
  /const primary = errorNoticeLine \|\| waitingLine \|\| itemStatusLine \|\| compactionLine;/.test(src) &&
    /const merged = narration \? `\$\{primary\} \\u00b7 \$\{narration\}` : primary;/.test(src)
);
ok("status content is grey", /const greyStatus = \(text\) => typeof text === "string" && text\.trim\(\) \? `<font color='grey'>\$\{text\}<\/font>` : "";/.test(src));
ok("answer state shows a grey generating line", /if \(streamText\.trim\(\)\) return greyStatus\("\\u270D\\uFE0F \\u751F\\u6210\\u56DE\\u590D\\u4E2D"\)/.test(src));

// --- 2) reasoning-phase status --------------------------------------------
ok("reasoning-only turns show a thinking status", /if \(reasoningText\.trim\(\)\) return greyStatus\("\\u\{1F4AD\} \\u601D\\u8003\\u4E2D\\u2026"\)/.test(src));

// --- 3) transient tool-error notice ---------------------------------------
ok("tool errors raise a transient status notice", /const showToolErrorNotice = \(\) => \{/.test(src) && src.includes("showToolErrorNotice();"));
ok("error notice clears itself", /errorNoticeTimer = setTimeout\(\(\) => \{[\s\S]*?errorNoticeLine = "";[\s\S]*?flushCardUpdate\(\);[\s\S]*?\}, 4e3\);/.test(src));
ok("error notice wins over the waiting line", /const primary = errorNoticeLine \|\| waitingLine/.test(src));
ok("error notice timer is released on status clear", /const clearCardStatusLines = \(\) => \{[\s\S]*?clearErrorNotice\(\);/.test(src));

// --- 4) tool icons ---------------------------------------------------------
{
  const env = new Function(`${extractIconMap(src)}\n${extractArrow(src, "resolveToolIcon")}\nreturn resolveToolIcon;`)();
  ok("exec uses the terminal icon", env("exec") === "\u{1F4BB}");
  ok("read uses the book icon", env("read") === "\u{1F4D6}");
  ok("search uses the magnifier icon", env("web_search") === "\u{1F310}");
  ok("unknown labels fall back", env("unknown_tool") === "\u{1F6E0}\uFE0F");
  ok("bare labels pick the mapped icon", /icon: resolveToolIcon\(normalized\),/.test(src));
}

// --- 5) timeline styling ---------------------------------------------------
ok("timeline uses grey non-bold timestamps", /const stamp = elapsed === "0s" \? "" : `<font color='grey'>\+\$\{elapsed\}<\/font>`;/.test(src));
ok("timeline hides zero-second stamps", /elapsed === "0s"/.test(src));
ok("timeline renders friendly tool names, not code ticks", /const label = entry\.kind === "tool" \? formatToolDisplayName\(entry\.text\)/.test(src) && !/entry\.kind === "tool" \? `\\`/.test(src));
ok("narration, tool and error entries are tagged", src.includes(', false, "narration");') && src.includes(', true, "tool");') && src.includes(', false, "error");'));
ok("timeline counts dropped entries", /let activityTimelineDropped = 0;/.test(src) && /activityTimelineDropped \+= 1;/.test(src));
{
  const displayMap = src.match(/const TOOL_DISPLAY_NAME_BY_LABEL = [\s\S]*?\]\);/)[0];
  const aliases = src.match(/const TOOL_LABEL_ALIASES = [^\n]+/)[0];
  const normalize = extractArrow(src, "normalizeToolLabel");
  const display = extractArrow(src, "formatToolDisplayName");
  const displayEnv = new Function(`${displayMap}\n${aliases}\n${normalize}\n${display}\nreturn formatToolDisplayName;`)();
  ok("display name for internal label", displayEnv("read") === "读取" && displayEnv("web_fetch") === "网页抓取", displayEnv("web_fetch"));
  ok("unknown display name falls back to words", displayEnv("my_tool") === "My Tool", displayEnv("my_tool"));

  const timeline = extractArrow(src, "buildTimelinePanelContent");
  const elapsed = extractArrow(src, "formatElapsedDuration");
  const escapeHtml = extractFunction("escapeCardHtml");
  const escapeMarkdown = extractFunction("escapeCardMarkdown");
  const timelineEnv = new Function(`
let activityTimeline = [];
let activityTimelineDropped = 0;
let cardStartedAt = 0;
${elapsed}
${escapeHtml}
${escapeMarkdown}
${displayMap}
${aliases}
${normalize}
${display}
${timeline}
return {
  set: (entries, dropped = 0) => { activityTimeline = entries; activityTimelineDropped = dropped; },
  render: buildTimelinePanelContent
};
`)();
  timelineEnv.set([{ at: 0, icon: "\u{1F4D6}", text: "read", kind: "tool", count: 1 }]);
  ok("timeline omits +0s and backticks", timelineEnv.render() === "\u{1F4D6} 读取", JSON.stringify(timelineEnv.render()));
  timelineEnv.set([{ at: 12_000, icon: "\u{1F4D6}", text: "read", kind: "tool", count: 2 }]);
  const stamped = timelineEnv.render();
  ok("timeline stamps in grey and merges counts", stamped.includes("<font color='grey'>+12s</font>") && stamped.includes("×2") && !stamped.includes("**"), stamped);
  timelineEnv.set([{ at: 0, icon: "\u26A0\uFE0F", text: "bad `x` <tag>", kind: "error", count: 1 }]);
  const escaped = timelineEnv.render();
  ok("timeline escapes dynamic text", escaped.includes("\\`x\\`") && escaped.includes("&lt;tag&gt;") && !escaped.includes("<tag>"), escaped);
  timelineEnv.set([{ at: 0, icon: "\u{1F4D6}", text: "read", kind: "tool", count: 1 }], 3);
  ok("timeline shows the dropped-entry marker", timelineEnv.render().includes("已省略 3 条"), timelineEnv.render());
}

// --- 6) details panel stats title -----------------------------------------
if (panelBodyMode) {
  ok("panel stats break down tools, narration and errors", /const buildPanelStatsLine = \(\) => \{[\s\S]*?aggregatedToolTotal[\s\S]*?narrationTimelineTotal[\s\S]*?toolErrorTotal/.test(src));
  {
    const stats = extractArrow(src, "buildPanelStatsLine");
    const statsEnv = new Function(`
let aggregatedToolTotal = 3;
let narrationTimelineTotal = 2;
let toolErrorTotal = 1;
let activityTimelineTotal = 6;
${stats}
return buildPanelStatsLine;
`)();
    const line = statsEnv();
    ok("panel stats use counts, not overlapping event totals", line.includes("3 次工具") && line.includes("2 条旁白") && line.includes("1 个错误") && !line.includes("事件"), line);
  }
  ok("panel body helper exists", /const buildPanelBody = \(details\) => \{/.test(src));
  ok("streaming writes the panel body, not the element", /elements: shouldQueueElements \? \{ detailspanel_body: nextDetails \}/.test(src) && !src.includes("panel: shouldQueueElements"));
  ok("close writes the final panel body", /writeElementContent\("detailspanel_body", finalDetails\)/.test(src));
  ok("no element-replace API dependency", !src.includes("replaceElement"));
  ok("queue has no panel replacement branch", !/panel && typeof session\.replaceElement/.test(src));
} else {
  ok("panel title shows only the event count (no tool/error duplicate)", /return `\\u\{1F9FE\} \\u8FC7\\u7A0B\\u8BB0\\u5F55 \\u00B7 \$\{activityTimelineTotal\} \\u4E8B\\u4EF6`;/.test(src));
  ok("panel element builder exists", /const buildDetailsPanelElement = \(title, body\) => \(\{/.test(src));
  ok("panel stats title is replaced during streaming", /panel: shouldQueueElements \? buildDetailsPanelElement\(nextPanelTitle, nextDetails\) : void 0,/.test(src));
  ok("close replaces the final panel body", /await streamingToClose\.replaceElement\("detailspanel", buildDetailsPanelElement\(buildPanelTitle\(\), finalDetails\)\)/.test(src));
  ok("session exposes replaceElement", /\tasync replaceElement\(elementId, element\) \{/.test(src));
  ok("queue applies panel replacements", /if \(panel && typeof session\.replaceElement === "function"\) \{/.test(src));
}

// --- 7) session replaceElement API (legacy layout only) --------------------
if (!panelBodyMode) {
  ok("session exposes replaceElement", /\tasync replaceElement\(elementId, element\) \{/.test(src) && /\/elements\/\$\{elementId\}`, "element-replace"/.test(src));
  ok("queue applies panel replacements", /if \(panel && typeof session\.replaceElement === "function"\) \{/.test(src));
}

// --- 8) pagination index moves into the status line -----------------------
ok("streamed page 1 carries the index in the status", /const pageSuffix = pendingPageSuffix \? ` \\u00b7 \\u\{1F4C4\} \$\{pendingPageSuffix\}` : "";/.test(src));
ok("page index is not duplicated in the footer", !/finalNote = pendingPageSuffix \?/.test(src));

if (panelBodyMode) {
  ok("tool-only card preview uses the completion summary", /summaryText: finalizedAnswerText\.trim\(\) === "" && !carriedNarration \? buildFinalSummaryLine\(finalElapsedMs\) : void 0/.test(src) && /truncateSummary\(summarySource\)/.test(src));
  ok("assistant start clears the error notice", /onAssistantMessageStart: previewStreamingEnabled \? \(\) => \{\s*clearErrorNotice\(\);/.test(src));
  ok("budget uses a rolling window", /const refreshUpdateBudgetWindow = \(\) => \{/.test(src) && /refreshUpdateBudgetWindow\(\);/.test(src));
  ok("invalid config knobs removed", !/cardIdleHoldMs|cardStatusElement|progressTexts|prewarmCard/.test(src));
  ok("narration is sanitised before the status merge", /sanitizeStatusNarration\(narrationLine\)/.test(src));
}

// --- 9) truncation caps ----------------------------------------------------
ok("narration cap is one line", /const NARRATION_MAX_CHARS = 120;/.test(src));
ok("per-turn update budgets cover long tool runs", /const STATUS_UPDATE_MAX_PER_TURN = 120;/.test(src) && /const DETAILS_UPDATE_MAX_PER_TURN = 180;/.test(src));
ok("timeline entries are capped", /const display = truncateDisplayText\(clean, 120\);/.test(src));

// --- 10) card text escaping / reasoning fences / copy ----------------------
{
  const escapeHtml = extractFunction("escapeCardHtml");
  const escapeMarkdown = extractFunction("escapeCardMarkdown");
  const env = new Function(`${escapeHtml}\n${escapeMarkdown}\nreturn { html: escapeCardHtml, md: escapeCardMarkdown };`)();
  ok("dynamic text is HTML-escaped", env.html("&<>") === "&amp;&lt;&gt;", env.html("&<>"));
  ok("dynamic text is markdown-escaped", env.md("a`b*c") === "a\\`b\\*c", env.md("a`b*c"));
}
ok("card note is escaped before the grey wrapper", src.includes("${escapeCardHtml(note)}"));
{
  const fence = extractFunction("detectOpenCodeFence");
  const reasoning = extractArrow(src, "buildReasoningPanelContent");
  const raw = "```js\nline1\nline2";
  const env = new Function(`
let reasoningText = ${JSON.stringify(raw)};
const REASONING_MAX_LINES = 12;
${fence}
${reasoning}
return buildReasoningPanelContent;
`)();
  const out = env();
  ok("reasoning closes an open code fence", out.endsWith("```") && !out.endsWith("````"), JSON.stringify(out));
  ok("reasoning truncation is UTF-16 safe", /const cut = sliceUtf16Safe\(text, 0, 1199\);/.test(src));
}
ok("generating placeholder is localised", !src.includes("[Generating...]") && src.includes("\\u23F3 \\u6B63\\u5728\\u751F\\u6210"));
ok("compaction status is localised", !src.includes("**Compacting context...**") && src.includes("\\u6B63\\u5728\\u538B\\u7F29\\u4E0A\\u4E0B\\u6587"));
ok("error completion copy is natural", src.includes("\\u26a0\\ufe0f \\u5df2\\u5b8c\\u6210") && !src.includes("\\u5b8c\\u6210\\u4f46\\u6709\\u9519\\u8BEF"));

finish("layout: merged status / icons / panel stats / pagination");
