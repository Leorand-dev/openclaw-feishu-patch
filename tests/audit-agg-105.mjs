// 2026.10.5 — structural audit of the optimized patch bundle.
import { loadBundle, count, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

// --- dead code from the 2026.10.2 port stays gone ---
for (const dead of [
  "aggregatedToolSummaryLine",
  "buildAggregatedToolSummaryLine",
  "AGGREGATED_TOOL_SUMMARY_MAX_CHARS",
  "backfillTotal",
  "markVisibleReplySent",
]) {
  ok(`dead symbol removed: ${dead}`, count(src, dead) === 0, `${count(src, dead)} occurrence(s)`);
}

// --- parsers / delivery guard (P1 M1/M3) ---
ok("narration helper declared once", count(src, "const isToolNarrationPayload = ") === 1);
ok("narration routes into card ticker", /if \(narrationPayload\) \{\s*await deliverNarrationToCard\(inputPayload\.text\);/.test(src));
ok("narration prefix matches core commentary", src.includes('const TOOL_NARRATION_TEXT_PREFIX = "\\u{1F4AC} ";'));
ok("parser requires own mediaUrls key", /hasOwnProperty\.call\(payload, "mediaUrls"\)/.test(src));
ok("parsers share safe text gate", count(src, "const getToolSummaryText = ") === 1 && /text\.startsWith\(TOOL_NARRATION_TEXT_PREFIX\)\) return void 0;/.test(src));
ok("tool labels normalized for real emitter", count(src, "const normalizeToolLabel = ") === 1 && /TOOL_LABEL_ALIASES = .*session_settings.*sessions/.test(src));
ok("real emitter summary cap present", /const TOOL_SUMMARY_MAX_CHARS = 400;/.test(src));
ok("real emitter label+detail shapes documented in tests", src.includes("const parseBareToolLabel = (payload, info) => {"));
ok("blanket kind:tool drop removed", !/if \(info\?\.kind === "tool" && inputPayload\?\.isError !== true\) return noVisibleFeishuReplyDelivery;/.test(src));

// --- V1: display state split + latest-state backfill ---
ok("structured display state exists", ["waitingLine", "itemStatusLine", "compactionLine", "narrationLine", "lastToolLabel"].every((v) => src.includes(`let ${v} = "";`)));
ok("running total counter exists", /let aggregatedToolTotal = 0;/.test(src) && /aggregatedToolTotal \+= 1;/.test(src));
ok("no per-event reduce over counts", !src.includes("Array.from(aggregatedToolSummaryCounts.values()).reduce"));
ok("status renderer uses one phase line with latest narration", /const primary = waitingLine \|\| itemStatusLine \|\| compactionLine;/.test(src) && /latestNarration = narrationLine/.test(src) && !/const secondary = extras/.test(src));
ok("content renderer separated from status and panels", /return \[streamText, statusFallback\]/.test(src) && /buildReasoningPanelContent/.test(src) && /buildToolsPanelContent/.test(src));
ok("flush uses latest-state providers + dirty split + budget", /content: contentChanged \? \(\) => renderCardContent\(\) : void 0/.test(src) && /status: shouldQueueStatus \? \(\) => buildStatusText\(\) : void 0/.test(src) && /nextContent !== lastQueuedContent/.test(src) && /statusUpdatesQueuedThisTurn/.test(src));
ok("card-start pending flush is coalesced", /cardFlushPending/.test(src) && /if \(!active && cardFlushPending && !force\) return;/.test(src));
ok("queue evaluates providers after start", /if \(startPromise\) await startPromise;[\s\S]{0,200}const contentText = typeof content === "function" \? content\(\) : content \?\? text;/.test(src));
ok("identical card text deduped by session", /if \(this\.statusPendingText === null \|\| this\.closed\) return;/.test(src));

// --- V1: early warm start + ticker polish ---
ok("early card prewarm wired", /previewStreamingEnabled && renderMode !== "raw" && account\.config\?\.prewarmCard !== false\) \{\s*prewarmRequested = true;\s*startStreaming\(\);/.test(src) && /prewarmStatusLine = resolveProgressText\("prewarm"/.test(src));
ok("ticker dedupes identical line", /if \(nextLine === narrationLine && streaming\?\.isActive\(\) === true\) return true;/.test(src));
ok("ticker uses safe truncation", /return truncateDisplayText\(collapsed, NARRATION_MAX_CHARS\);/.test(src));
ok("surrogate-safe truncate helper", /const truncateDisplayText = \(text, max\) => \{\s*const chars = Array\.from\(text\);/.test(src));

// --- V2: dual card element + structured status ---
ok("card JSON has status element", /element_id: "status"/.test(src) && /this\.statusElementEnabled && this\.statusPosition === "top"/.test(src) && /this\.statusElementEnabled && this\.statusPosition !== "top"/.test(src));
ok("session updates status element", /async updateStatus\(text\) \{/.test(src) && src.includes("elements/status/content"));
ok("status write asserts CardKit response", /assertSuccessfulCardKitResponse\(response, auditContext, "Update card status content"\)/.test(src));
ok("close deletes status element", /async deleteStatusElement\(\) \{/.test(src) && src.includes("elements/status") && /Delete card status element/.test(src));
ok("status failure falls back into content", /streaming\?\.isStatusUnavailable\?\.\(\) === true \? buildStatusText\(\)/.test(src) && /onStatusUnavailable: \(\) => \{/.test(src));
ok("status updates throttled", /statusLastUpdateTime/.test(src) && /schedulePendingStatusFlush/.test(src));

// --- V2: waiting-line enhancements / config ---
ok("waiting template uses progressTexts", /resolveProgressText\("toolWaiting"/.test(src));
ok("compacting template uses progressTexts", /resolveProgressText\("compacting"/.test(src));
ok("optional last-tool label", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src));
ok("compact status budget present", /const STATUS_LINE_MAX_CHARS = 160;/.test(src) && /const STATUS_MAX_CHARS = 400;/.test(src));

// --- V3: backoff / hold config / observability ---
ok("streaming start backoff reduced", /STREAMING_START_FAILURE_BACKOFF_MS = 15e3;/.test(src));
ok("hold window configurable", /cardIdleHoldMs/.test(src) && /configured >= 2e3 && configured <= 3e4 \? configured : 8000/.test(src));
ok("card start latency logged", /streaming card ready in \$\{Date\.now\(\) - cardStartAt\}ms/.test(src));
ok("status element can be disabled by config", /cardStatusElement !== false/.test(src));

// --- preserved 2026.10.5 features ---
ok("waiting string intact", src.includes("\\u23F3 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177") && src.includes("\\uff0c\\u7b49\\u5f85\\u4e2d\\u2026"));
ok("waiting line shows last tool / elapsed", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /configured >= 5e3 && configured <= 6e4 \? configured : 15e3/.test(src));
ok("completed string intact", src.includes("\\u2705 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177"));
ok("bare-label whitelist intact", src.includes("const BARE_TOOL_LABELS = "));
ok("block text not blindly appended", /if \(info\?\.kind === "block"\) queueStreamingBlockUpdate\(text\);/.test(src) && !/if \(info\?\.kind === "block"\) queueStreamingUpdate\(text, \{/.test(src));
ok("final summary falls back to Chinese status", /if \(!clean\) return "✅ 已回复";/.test(src));
ok("tool-done status line declared", /const buildToolDoneLine = \(total\) =>/.test(src) && src.includes('"toolDone"'));
ok("elapsed refresh coalesced with tool events", /clearWaitingRefreshTimer\(\);\s*scheduleWaitingRefresh\(\);/.test(src));
ok("dirty split skips unchanged fields", /nextContent !== lastQueuedContent/.test(src) && /nextStatus !== lastQueuedStatus/.test(src));
ok("block merge dedupes overlapping text", /streamText = mergeStreamingText\(streamText, nextText\);/.test(src) && /queueStreamingBlockUpdate/.test(src));
ok("mid-turn block fold intact", count(src, "const midTurnBlockFold =") === 1);
ok("counts cleared on reset", /const resetStreamingState = \(\) => \{[\s\S]*?aggregatedToolSummaryCounts\.clear\(\);/.test(src));
ok("counts cleared on reply start", /onReplyStart: async \(\) => \{[\s\S]*?aggregatedToolSummaryCounts\.clear\(\);/.test(src));
ok("failed outcome releases hold", /replyOutcome\?\.kind === "failed"/.test(src));
ok("fallback final content recorded for dedupe", /const deliveredFinalContent = finalizedAnswerText \|\| text;/.test(src) && /deliveredFinalTexts\.add\(deliveredFinalContent\);/.test(src));
ok("fallback send records final dedupe", /if \(infoKind === "final" && delivered\?\.visibleReplySent === true\) deliveredFinalTexts\.add\(content\);/.test(src));

ok("final delivery tracked for lifecycle", /const isFinalDelivery = info\?\.kind === "final";/.test(src) && /finalDeliverySeen = true;/.test(src) && /finalDeliveryInProgress = true;/.test(src));
ok("final delivery in-progress guard", /let finalDeliveryInProgress = false;/.test(src) && /!finalDeliverySeen \|\| finalDeliveryInProgress/.test(src) && /finalDeliveryInProgress = false;/.test(src));
ok("cleanup respects final in-progress", /streaming\?\.isActive\(\) === true && !finalDeliveryInProgress/.test(src));
ok("cleanup close deferred by grace", /CLEANUP_CLOSE_GRACE_MS = 2e3;/.test(src) && /scheduleCleanupClose\(\)/.test(src) && /clearCleanupCloseTimer\(\)/.test(src));
ok("unaggregated tool payload diagnostics", /const logUnaggregatedToolPayload = /.test(src) && /unaggregated tool payload: label=/.test(src));
ok("card lifecycle watchdog", /const CARD_MAX_LIFETIME_MS = /.test(src) && /const startCardWatchdog = /.test(src) && /startCardWatchdog\(\);/.test(src) && /clearCardWatchdog\(\);/.test(src));
ok("status update budget per turn", /const STATUS_UPDATE_MAX_PER_TURN = 60;/.test(src) && /status update budget reached/.test(src) && /statusUpdatesQueuedThisTurn = 0;/.test(src));

ok("final static fallback discards active preview", /final static fallback: discarding active streaming preview/.test(src));

ok("active card held until final", /streaming\?\.isActive\(\) === true && \(!finalDeliverySeen \|\| finalDeliveryInProgress\) && !terminalQuiet/.test(src));
ok("cleanup finalizes active card", /onCleanup: \(\) => \{/.test(src) && /streaming\?\.isActive\(\) === true && !finalDeliveryInProgress/.test(src) && /cleanup card finalization failed/.test(src));

ok("waiting line switches to tool-done on assistant start", /if \(aggregatedToolTotal > 0\) \{\s*clearTransientStatusLines\(\);\s*toolPhaseCompleted = true;\s*clearWaitingRefreshTimer\(\);\s*waitingLine = buildToolDoneLine\(aggregatedToolTotal\);/.test(src));
ok("transient clear keeps waiting line", /const clearTransientStatusLines = \(\) => \{\s*itemStatusLine = "";\s*compactionLine = "";\s*narrationLine = "";/.test(src));
ok("idle hold uses running total", /const hasToolActivity = aggregatedToolTotal > 0;/.test(src));
ok("timer lifecycle preserved", /const clearIdleCloseTimer = \(\) => \{/.test(src) && /idleCloseTimer\.unref\?\.\(\);/.test(src) && /!visibleReplySent && !terminalQuiet/.test(src));
ok("empty tool-only card uses final summary", /resolveFinalCardText = \(answer, elapsedMs\)/.test(src) && /buildFinalSummaryLine\(elapsedMs\)/.test(src));
ok("status position defaults to top", /cardStatusPosition === "bottom" \? "bottom" : "top"/.test(src));
ok("reasoning preview cap / final details removal", /REASONING_MAX_LINES/.test(src) && /finalReasoningForPanel/.test(src) && /deleteElement\("detailspanel"\)/.test(src));
ok("final tool summary defaults on", /FINAL_TOOL_SUMMARY = account\.config\?\.finalToolSummary !== false;/.test(src));
ok("empty prewarmed card is discarded", /const shouldDiscardEmptyCard = disposition !== "discarded" && !text\.trim\(\) && !carriedNarration && aggregatedToolTotal === 0;/.test(src) && /disposition === "discarded" \|\| shouldDiscardEmptyCard\) closed = await streamingToClose\.discard\(\);/.test(src));

ok("single collapsible details panel exists", /collapsible_panel/.test(src) && /detailspanel/.test(src) && /buildDetailsPanelContent/.test(src));
ok("nested details body is updated", /writeElementContent/.test(src) && /detailspanel_body/.test(src));
ok("tool errors are aggregated into the error panel", /aggregateToolErrorToCard/.test(src) && /toolErrors\.push/.test(src));
ok("footer keeps only agent/model/provider", /function resolveCardNote\(agentId, identity, prefixCtx\)/.test(src) && !/meta\.tps/.test(src));
ok("reasoning panel is capped by lines and chars", /lines\.slice\(0, REASONING_MAX_LINES\)/.test(src) && /text\.length > 1200/.test(src));
ok("tool errors are sanitized before display", /sanitizeToolErrorText/.test(src) && /redacted/.test(src));
ok("card flushes are coalesced", /CARD_FLUSH_COALESCE_MS/.test(src) && /flushCardUpdateNow/.test(src));
ok("details panel writes are budgeted", /DETAILS_UPDATE_MAX_PER_TURN/.test(src) && /detailsUpdatesQueuedThisTurn/.test(src));
ok("narration section exists in details", /buildNarrationPanelContent/.test(src) && /\u{1F4AC} \\u65C1\\u767D/.test(src));
ok("background card starts when no active card", /backgroundCardActive/.test(src) && /startStreaming\(\)/.test(src) && /scheduleBackgroundClose/.test(src));
ok("over-limit final keeps preview and paginates", /pendingPageSuffix/.test(src) && /pageChunks\.length > 1/.test(src) && /finalTextExceedsStreamingLimit/.test(src));
ok("continuation cards are numbered and omit details", /1F4C4/.test(src) && /headerTemplate/.test(src));
ok("page cards preserve required mentions", /pageFirstMentionParams/.test(src) && /pageContinuationMentionParams/.test(src));
ok("paginated final records delivered text", /deliveredFinalTexts\.add\(text\)/.test(src));
ok("long media replies paginate then send media", /finalTextExceedsStreamingLimit[^\n]*!presentationCard/.test(src) && /sendMediaReplies\(payload, !shouldDeliverText/.test(src));
ok("background card close is serialized", /backgroundClosePromise/.test(src) && /closeBackgroundCard/.test(src));
// --- no undefined references introduced by the changes ---
for (const symbol of [
  "isToolNarrationPayload",
  "shouldSuppressItemProgressStatusLine",
  "clearIdleCloseTimer",
  "scheduleIdleCloseTimer",
  "resolveFinalCardText",
  "AGGREGATED_PROGRESS_ITEM_KINDS",
  "TOOL_NARRATION_TEXT_PREFIX",
  "buildWaitingLine",
  "buildFinalSummaryLine",
  "buildStatusText",
  "flushCardUpdate",
  "updateWaitingLine",
  "clearCardStatusLines",
  "clearTransientStatusLines",
  "formatElapsedDuration",
  "clearWaitingRefreshTimer",
  "scheduleWaitingRefresh",
  "REASONING_MAX_LINES",
  "HIDE_REASONING_IN_FINAL",
  "FINAL_TOOL_SUMMARY",
  "truncateDisplayText",
]) {
  const declarations = count(src, `const ${symbol} = `);
  const references = count(src, symbol);
  ok(`symbol resolvable: ${symbol}`, declarations === 1 && references >= 2, `decl=${declarations} refs=${references}`);
}
for (const symbol of ["isStatusUnavailable", "updateStatus", "writeStatusContent"]) {
  ok(`session method present: ${symbol}`, src.includes(`\t${symbol}(`) || src.includes(`\tasync ${symbol}(`), symbol);
}

// --- pristine delivery path kept ---
ok("renders non-tool payloads", src.includes("const prepared = await renderFeishuReplyPayload(inputPayload, {"));
ok("tool errors remain visible", /if \(toolErrorPayload\) \{[\s\S]{0,160}aggregateToolErrorToCard/.test(src));

finish("2026.10.5 structural audit");
