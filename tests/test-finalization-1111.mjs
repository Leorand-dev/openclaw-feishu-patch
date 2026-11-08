// 2026.11.1 batch6 — final status line, progress element, details finalization, retries.
import { loadBundle, makeCounter, extractArrow, extractConstLine } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const finalLine = extractArrow(src, "buildFinalStatusLine");
const combined = extractArrow(src, "buildCombinedStreamText");
const progress = extractConstLine(src, "formatProgressLine");
const finalSandbox = new Function(`
  let aggregatedToolTotal = 2;
  let cardStartedAt = Date.now() - 62000;
  let statusLine = "";
  const formatReasoningPrefix = () => "";
  const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s"; };
  ${finalLine}
  ${combined}
  ${progress}
  const line = buildFinalStatusLine();
  statusLine = line;
  return { line, text: buildCombinedStreamText("", "answer"), progressLine: formatProgressLine(line) };
`)();

ok("final line includes completion and tool count", finalSandbox.line.startsWith("✅ 完成") && finalSandbox.line.includes("已执行 2 个工具"));
ok("final line includes duration", /1m0[12]s/.test(finalSandbox.line));
ok("answer text no longer embeds the status line", finalSandbox.text === "answer");
ok("final status line is rendered as grey progress text", finalSandbox.progressLine.startsWith("<font color='grey'>✅ 完成") && finalSandbox.progressLine.endsWith("</font>"));

const methodStart = src.indexOf("\tasync writeCardContent(text, replace, onError) {");
const methodEnd = src.indexOf("\n\tasync writeElementContent", methodStart);
if (methodStart < 0 || methodEnd < 0) throw new Error("writeCardContent method missing");
const methodBody = src.slice(methodStart, methodEnd);
const innerBody = methodBody.slice(methodBody.indexOf("{") + 1, methodBody.lastIndexOf("}"));
const buildWrite = new Function(`
  const CARD_WRITE_RETRY_MAX_ATTEMPTS = 3;
  const CARD_WRITE_RETRY_BASE_DELAY_MS = 1;
  const isRetryableCardKitError = (error) => error?.retryable === true || Number(error?.httpStatus) >= 500 || Number(error?.httpStatus) === 429;
  const delayMs = async () => {};
  return async function writeCardContent(text, replace, onError) {${innerBody}};
`);

async function runWrite(errors) {
  const calls = [];
  const session = {
    state: { cardId: "card", sequence: 0 },
    log: () => {},
    requestCardKit: async (path, operation, method, body) => {
      const payload = typeof body === "function" ? body() : body;
      calls.push({ sequence: payload.sequence, uuid: payload.uuid });
      const error = errors[calls.length - 1];
      if (error) throw error;
    }
  };
  let reported;
  const write = buildWrite();
  const sent = await write.call(session, "hello", false, (error) => { reported = error; });
  return { sent, calls, reported, session };
}

const transient = await runWrite([{ httpStatus: 500 }, null]);
ok("transient card write retries", transient.sent === true && transient.calls.length === 2);
ok("recovered retry does not report finalization error", transient.reported === undefined);
ok("retry replays the same sequence/uuid", transient.calls[0].sequence === transient.calls[1].sequence && transient.calls[0].uuid === transient.calls[1].uuid);
const permanent = await runWrite([{ httpStatus: 400 }]);
ok("permanent card write does not retry", permanent.sent === false && permanent.calls.length === 1);
ok("permanent card write reports error once", permanent.reported?.httpStatus === 400);

ok("idle hold defers mid-tool idle close", src.includes("const CARD_IDLE_HOLD_MS = 8e3;") && src.includes("onIdle: () => {") && src.includes("scheduleIdleHold();"));
ok("idle hold is bounded and re-checks tool activity", src.includes("idleHoldRenewals < CARD_IDLE_HOLD_MAX_RENEWALS") && src.includes("const stillHolding = aggregatedToolTotal > 0 && !streamText.trim() && streaming?.isActive();"));
ok("activity refreshes an armed hold", src.includes("const refreshIdleHold = () => {") && src.includes("refreshIdleHold();"));
ok("held close keeps tool counts and uses neutral line", src.includes("if (!heldClose) {") && src.includes("heldClose ? buildHeldStatusLine() : buildFinalStatusLine()"));
ok("cleanup cancels a pending hold", src.includes("clearIdleHold();\n\t\t\ttypingCallbacks?.onCleanup?.();"));
ok("tool phase completes when answer starts", (src.match(/toolPhaseCompleted = true;/g) || []).length >= 2);
ok("close settings writes retry", src.includes("Close failed after retries"));
ok("close writes completion line via finalStatusLine", src.includes("heldClose ? buildHeldStatusLine() : buildFinalStatusLine()") && src.includes("statusLine = finalStatusLine;"));
ok("final details are computed before state reset", src.indexOf("const finalDetails = disposition") > 0 && src.indexOf("const finalDetails = disposition") < src.indexOf("resetStreamingState();"));
ok("final card close passes status line and details", src.includes("closeWithResult(text, {") && src.includes("statusLine: formatProgressLine(finalStatusLine)") && src.includes("details: finalDetails"));
ok("empty tool turn removes the details panel", src.includes('deleteElementForced("detailspanel")') && src.includes('deleteElementForced("divider")'));
ok("non-empty tool turn replaces details with column_set", src.includes('putElementPayload("detailspanel_body", options.details, "replace")'));
ok("discard path preserved", src.includes("if (disposition === \"discarded\") closed = await streamingToClose.discard();"));
ok("no legacy status element in finalizer", !src.includes("deleteStatusElement") && !src.includes("keepStatus"));
ok("prewarm status line is wired", src.includes("const PREWARM_STATUS_LINE") && src.includes("applyPrewarmStatus();"));
ok("prewarm is cleared when output starts", src.includes('updateProgress(statusLine ? formatProgressLine(statusLine) : "\\u200B")'));
ok("prewarm marker resets with streaming state", (src.match(/prewarmStatusLine = "";/g) || []).length >= 2);
ok("per-turn api call counter exists", src.includes("const feishuApiCallCounts = { card: 0, message: 0, reaction: 0 };") && src.includes("const noteFeishuApiCall = (kind) => {"));
ok("cardkit requests are counted", src.includes("this.onApiCall?.(\"card\");"));
ok("message sends and deletes are counted", (src.match(/this\.onApiCall\?\.\("message"\);/g) || []).length >= 2);
ok("typing reactions are counted", (src.match(/noteFeishuApiCall\("reaction"\);/g) || []).length >= 2);
ok("streaming session receives the counter callback", src.includes("new FeishuStreamingSession(createFeishuClient(account), creds,") && src.includes(", noteFeishuApiCall);"));
ok("turn api call total is logged at cleanup", src.includes("turn api calls: total=${apiCalls} card=${feishuApiCallCounts.card} message=${feishuApiCallCounts.message} reaction=${feishuApiCallCounts.reaction}"));

finish("2026.11.1 finalization/reliability");
