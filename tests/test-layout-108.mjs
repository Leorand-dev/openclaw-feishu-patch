// Layout pass: merged grey status row, tool icons, styled timeline, stats panel
// title, pagination index in the status line, and the transient error notice.
import { loadBundle, extractArrow, extractIconMap, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();
const panelBodyMode = src.includes("buildPanelBody");

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
ok("timeline uses bold relative timestamps", /return `\*\*\+\$\{formatElapsedDuration\(Math\.max\(0, entry\.at - cardStartedAt\)\)\}\*\* \$\{entry\.icon\}/.test(src));
ok("timeline renders tool labels as code", /entry\.kind === "tool" \? `\\`\$\{entry\.text\}\\`` : entry\.text/.test(src));
ok("narration, tool and error entries are tagged", src.includes(', false, "narration");') && src.includes(', true, "tool");') && src.includes(', false, "error");'));

// --- 6) details panel stats title -----------------------------------------
if (panelBodyMode) {
  ok("panel body carries event/tool stats", /const buildPanelStatsLine = \(\) => \{[\s\S]*?activityTimelineTotal[\s\S]*?aggregatedToolTotal/.test(src));
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

finish("layout: merged status / icons / panel stats / pagination");
