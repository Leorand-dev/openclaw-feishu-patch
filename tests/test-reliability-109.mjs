// 2026.10.9 — reliability batch 2: status-write retry + write-result acknowledgement.
import { loadBundle, extractArrow, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

// ---------- helpers ----------
const extractFunction = (name) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function: ${name}`);
  const end = src.indexOf("\n}", start);
  if (end < 0) throw new Error(`unterminated function: ${name}`);
  return src.slice(start, end + 2);
};

const extractMethodBody = (signature, nextSignature) => {
  const start = src.indexOf(signature);
  if (start < 0) throw new Error(`missing method: ${signature}`);
  const end = src.indexOf(nextSignature, start);
  if (end < 0) throw new Error(`missing next method: ${nextSignature}`);
  const method = src.slice(start, end);
  const bodyStart = method.indexOf("{") + 1;
  const bodyEnd = method.lastIndexOf("}");
  return method.slice(bodyStart, bodyEnd);
};

// ---------- 1) retryable-vs-permanent classification ----------
const isRetryableCardKitError = new Function(`${extractFunction("isRetryableCardKitError")}\nreturn isRetryableCardKitError;`)();
ok("retryable: HTTP 429", isRetryableCardKitError({ httpStatus: 429 }) === true);
ok("retryable: HTTP 500", isRetryableCardKitError({ httpStatus: 500 }) === true);
ok("retryable: HTTP 503", isRetryableCardKitError({ httpStatus: 503 }) === true);
ok("retryable: HTTP 408", isRetryableCardKitError({ httpStatus: 408 }) === true);
ok("retryable: Feishu backoff code", isRetryableCardKitError({ feishuCode: 99991400 }) === true);
ok("retryable: network failure", isRetryableCardKitError(new Error("fetch failed")) === true);
ok("permanent: HTTP 400", isRetryableCardKitError({ httpStatus: 400 }) === false);
ok("permanent: HTTP 404", isRetryableCardKitError({ httpStatus: 404 }) === false);
ok("permanent: validation error", isRetryableCardKitError(new Error("Update card status content failed: field validation failed (code=2007401)")) === false);

// ---------- 2) writeStatusContent retries transient failures with a cap ----------
const statusBody = extractMethodBody("\tasync writeStatusContent(text) {", "\n\tasync deleteStatusElement(");
const makeWriteStatus = () => new Function(
  "STATUS_UPDATE_MAX_ATTEMPTS",
  "STATUS_RETRY_BASE_DELAY_MS",
  "isRetryableCardKitError",
  "delayMs",
  `return async function writeStatusContent(text) {${statusBody}};`
)(3, 0, isRetryableCardKitError, () => Promise.resolve());

const makeSession = (failures, failure) => {
  const calls = [];
  const session = {
    state: { cardId: "card", sequence: 0 },
    statusElementEnabled: true,
    closed: false,
    statusConfirmed: false,
    statusUnavailable: false,
    log: () => void 0,
    requestCardKit: async (_path, _operation, _method, body) => {
      const payload = body();
      calls.push({ body: payload, payload });
      if (calls.length <= failures) throw failure;
      return {};
    }
  };
  return { session, calls };
};
{
  const { session, calls } = makeSession(1, { httpStatus: 500, message: "HTTP 500" });
  const write = makeWriteStatus();
  const sent = await write.call(session, "status");
  ok("transient status failure is retried and succeeds", sent === true && calls.length === 2 && session.statusUnavailable === false);
  ok("retry uses a fresh sequence/uuid", calls[1].payload.uuid !== calls[0].payload.uuid && calls[1].payload.sequence !== calls[0].payload.sequence);
}
{
  const { session, calls } = makeSession(99, { httpStatus: 503, message: "HTTP 503" });
  const write = makeWriteStatus();
  const sent = await write.call(session, "status");
  ok("transient status failure stops at the attempt cap", sent === false && calls.length === 3);
  ok("status is only marked unavailable after retries are exhausted", session.statusUnavailable === true);
}
{
  const { session, calls } = makeSession(99, { httpStatus: 400, message: "HTTP 400" });
  const write = makeWriteStatus();
  const sent = await write.call(session, "status");
  ok("permanent status failure falls back immediately", sent === false && calls.length === 1 && session.statusUnavailable === true);
}

// ---------- 3) queue returns per-field write results ----------
const qStart = src.indexOf("function queueFeishuStreamingUpdate(params) {");
const qEnd = src.indexOf("\n}", qStart) + 2;
const queueFn = new Function(`${src.slice(qStart, qEnd)}\nreturn queueFeishuStreamingUpdate;`)();

{
  const seen = [];
  const session = {
    isActive: () => true,
    update: (text, options) => { seen.push(["content", text, options]); return Promise.resolve(true); },
    updateStatus: (text, options) => { seen.push(["status", text, options]); return Promise.resolve(true); },
    writeElementContent: (id, text) => { seen.push(["element", id, text]); return Promise.resolve(true); }
  };
  const result = await queueFn({
    queue: Promise.resolve(),
    session,
    generation: 1,
    startPromise: null,
    content: () => "body",
    status: () => "status",
    elements: { detailspanel_body: "details" },
    accountId: "acct",
    runtime: { error: () => void 0 }
  });
  ok("queue result reports content/status/elements success", result?.content === true && result?.status === true && result?.elements?.detailspanel_body === true);
  ok("content write waits for confirmation", seen.find(([kind]) => kind === "content")?.[2]?.awaitWrite === true);
  ok("status write waits for confirmation", seen.find(([kind]) => kind === "status")?.[2]?.awaitWrite === true);
}
{
  let fallbacks = 0;
  const session = {
    isActive: () => true,
    update: () => Promise.resolve(false),
    updateStatus: () => Promise.resolve(false),
    writeElementContent: () => Promise.resolve(false)
  };
  const result = await queueFn({
    queue: Promise.resolve(),
    session,
    generation: 1,
    startPromise: null,
    content: () => "body",
    status: () => "status",
    elements: { detailspanel_body: "details" },
    accountId: "acct",
    runtime: { error: () => void 0 },
    onStatusUnavailable: () => { fallbacks += 1; }
  });
  ok("queue result reports failed writes", result?.content === false && result?.status === false && result?.elements?.detailspanel_body === false);
  ok("status fallback fires only for a failed status write", fallbacks === 1);
}

// ---------- 4) acknowledgement only advances caches on success ----------
const ackSrc = extractArrow(src, "acknowledgeCardUpdate");
const makeAckEnv = () => new Function(`
	let cardUpdateSerial = 1;
	let lastAckedContent = "acked-content";
	let lastAckedStatus = "acked-status";
	let lastAckedDetails = "acked-details";
	let lastAckedReasoning = "acked-reasoning";
	let lastQueuedContent = "queued-content";
	let lastQueuedStatus = "queued-status";
	let lastQueuedDetails = "queued-details";
	let lastQueuedReasoning = "queued-reasoning";
	let lastReasoningQueuedAt = 1;
	let cardWriteRetryAttempt = 0;
	let retryCalls = 0;
	let statusUnavailable = false;
	const streaming = { isStatusUnavailable: () => statusUnavailable };
	const scheduleCardWriteRetry = () => { retryCalls += 1; };
	${ackSrc}
	return {
		ack: acknowledgeCardUpdate,
		state: () => ({ lastAckedContent, lastAckedStatus, lastAckedDetails, lastAckedReasoning, lastQueuedContent, lastQueuedStatus, lastQueuedDetails, lastQueuedReasoning, retryCalls }),
		setStatusUnavailable: (value) => { statusUnavailable = value; },
		bumpSerial: () => { cardUpdateSerial += 1; }
	};
`)();

{
  const env = makeAckEnv();
  const snapshot = { content: "content-2", status: "status-2", details: "details-2", reasoning: "reasoning-2", contentQueued: true, statusQueued: true, detailsQueued: true, reasoningDue: true };
  env.ack(1, snapshot, { content: true, status: true, elements: { detailspanel_body: true } });
  const state = env.state();
  ok("success acknowledges content", state.lastAckedContent === "content-2");
  ok("success acknowledges status", state.lastAckedStatus === "status-2");
  ok("success acknowledges details and reasoning", state.lastAckedDetails === "details-2" && state.lastAckedReasoning === "reasoning-2");
  ok("success does not schedule a retry", state.retryCalls === 0);
}
{
  const env = makeAckEnv();
  const snapshot = { content: "content-2", status: "status-2", details: "details-2", reasoning: "reasoning-2", contentQueued: true, statusQueued: true, detailsQueued: true, reasoningDue: true };
  env.ack(1, snapshot, { content: false, status: false, elements: { detailspanel_body: false } });
  const state = env.state();
  ok("failed content write keeps the previous acknowledged value", state.lastQueuedContent === "acked-content");
  ok("failed status write keeps the previous acknowledged value", state.lastQueuedStatus === "acked-status");
  ok("failed element write keeps the previous acknowledged value", state.lastQueuedDetails === "acked-details");
  ok("failed write schedules one bounded retry", state.retryCalls === 1);
}
{
  const env = makeAckEnv();
  env.setStatusUnavailable(true);
  const snapshot = { content: "content-2", status: "status-2", details: "details-2", reasoning: "reasoning-2", contentQueued: false, statusQueued: true, detailsQueued: false, reasoningDue: false };
  env.ack(1, snapshot, { status: false });
  ok("status fallback is not retried after the element is unavailable", env.state().retryCalls === 0);
}
{
  const env = makeAckEnv();
  const snapshot = { content: "content-2", status: "status-2", details: "details-2", reasoning: "reasoning-2", contentQueued: true, statusQueued: true, detailsQueued: true, reasoningDue: true };
  env.ack(1, snapshot, void 0);
  const state = env.state();
  ok("missing write result does not acknowledge a cache", state.lastQueuedContent === "acked-content" && state.lastQueuedStatus === "acked-status" && state.lastQueuedDetails === "acked-details");
  ok("missing write result still schedules a retry", state.retryCalls === 1);
}
{
  const env = makeAckEnv();
  env.bumpSerial();
  const snapshot = { content: "content-2", status: "status-2", details: "details-2", reasoning: "reasoning-2", contentQueued: true, statusQueued: true, detailsQueued: true, reasoningDue: true };
  env.ack(1, snapshot, { content: false, status: false, elements: { detailspanel_body: false } });
  const state = env.state();
  ok("stale write result cannot roll back a newer update", state.lastQueuedContent === "queued-content" && state.retryCalls === 0);
}

// ---------- 5) structural wiring ----------
ok("status retry budget is a fixed constant", /const STATUS_UPDATE_MAX_ATTEMPTS = 3;/.test(src));
ok("card write retry budget is capped", /const CARD_WRITE_RETRY_MAX_ATTEMPTS = 3;/.test(src));
ok("status retry logs the final attempt count", /Status update failed after \$\{attempts\} attempt\(s\)/.test(src));
ok("status success is cached only after a successful write", /if \(sent\) this\.statusSentText = nextText;/.test(src));
ok("failed status text is retained when the element remains available", /else if \(!this\.statusUnavailable\) this\.statusPendingText = nextText;/.test(src));
ok("write-result acknowledgement exists", src.includes("acknowledgeCardUpdate(serial, snapshot, result)"));
ok("acknowledgement runs after the queued write", src.includes("settleQueuedUpdate(result, void 0)") && src.includes("acknowledgeCardUpdate(serial, snapshot, result)") && src.includes("partialUpdateQueue = queued.then"));
ok("failed writes schedule a retry", /if \(failed\) scheduleCardWriteRetry\(\);/.test(src));
ok("turn reset clears write acknowledgement state", (src.match(/resetCardWriteTracking\(\);/g) || []).length >= 2);
ok("update/updateStatus accept awaitWrite", /async update\(text, options = \{\}\)/.test(src) && /async updateStatus\(text, options = \{\}\)/.test(src));

finish("2026.10.9 reliability batch 2 (status retry / write ack)");
