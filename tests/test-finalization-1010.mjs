// 2026.10.10 batch5 — final completion status and card-write reliability.
import { loadBundle, makeCounter, extractArrow } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const finalLine = extractArrow(src, "buildFinalStatusLine");
const combined = extractArrow(src, "buildCombinedStreamText");
const finalSandbox = new Function(`
  let aggregatedToolTotal = 2;
  let cardStartedAt = Date.now() - 62000;
  let statusLine = "";
  const formatReasoningPrefix = () => "";
  const formatElapsedDuration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s"; };
  ${finalLine}
  ${combined}
  const line = buildFinalStatusLine();
  statusLine = line;
  return { line, text: buildCombinedStreamText("", "answer") };
`)();

ok("final line includes completion and tool count", finalSandbox.line.startsWith("✅ 完成") && finalSandbox.line.includes("已执行 2 个工具"));
ok("final line includes duration", /1m0[12]s/.test(finalSandbox.line));
ok("final answer keeps completion line", finalSandbox.text.includes("answer") && finalSandbox.text.includes("✅ 完成"));

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
ok("final card close uses accepted result", src.includes("closeWithResult(text, { note: finalNote })"));
ok("discard path preserved", src.includes("if (disposition === \"discarded\") closed = await streamingToClose.discard();"));
ok("no status element in finalizer", !src.includes("deleteStatusElement") && !src.includes("keepStatus"));

finish("2026.10.10 finalization/reliability");
