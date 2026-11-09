// 2026.11.1 batch6 — CardKit session shape: content + progress + divider + details panel.
import { loadBundle, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const classStart = src.indexOf("var FeishuStreamingSession = class {");
// 2026.11.2 wraps upstream section comments in `//#region` / `//#endregion`
// markers, so anchor on the bare module path and cut back to its line start.
const markerIdx = src.indexOf("extensions/feishu/src/streaming-update.ts", classStart);
const classEnd = markerIdx < 0 ? -1 : src.lastIndexOf("\n", markerIdx) + 1;
if (classStart < 0 || classEnd < 0) throw new Error("FeishuStreamingSession not found");
const classSrc = src.slice(classStart, classEnd);

// The CardKit error classifiers are real code under test, not stubs.
const helperStart = src.indexOf("/** CardKit codes that mean this card's streaming window is already over. */");
const helperEnd = src.indexOf("const delayMs = ", helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error("cardkit error helpers not found");
const cardKitHelpers = src.slice(helperStart, helperEnd);

const Session = new Function([
  "const STREAMING_UPDATE_THROTTLE_MS = 250;",
  "const STREAMING_SIGNIFICANT_DELTA_CHARS = 18;",
  "const CARD_WRITE_RETRY_MAX_ATTEMPTS = 3;",
  "const CARD_WRITE_RETRY_BASE_DELAY_MS = 1;",
  cardKitHelpers,
  "const delayMs = async () => {};",
  "const assertSuccessfulCardKitResponse = async () => {};",
  "const cancelUnreadResponseBody = () => {};",
  "const resolveFeishuCardTemplate = (value) => value;",
  "const requestFeishuApi = async (fn) => await fn();",
  "const readFeishuJsonResponse = async () => ({ code: 0, data: { card_id: 'c1' } });",
  "const getToken = async () => 'token';",
  "const resolveApiBase = () => '';",
  "const fetchWithSsrFGuard = async () => ({ response: {}, release: async () => {} });",
  "const sliceUtf16Safe = (value, start, end) => value.slice(start, end);",
  "const truncateSummary = (value, max = 50) => String(value ?? '').slice(0, max);",
  "const shouldPushStreamingUpdate = () => true;",
  "class FeishuStreamingFinalizationError extends Error { constructor(cause, result) { super(String(cause)); this.cause = cause; this.result = result; } }",
  classSrc,
  "return { FeishuStreamingSession, isRetryableCardKitError, isStreamingClosedError };"
].join("\n"));
const { FeishuStreamingSession: StreamingSession, isRetryableCardKitError, isStreamingClosedError } = new Session();

const calls = [];
const client = {
  im: {
    message: {
      create: async () => ({ code: 0, data: { message_id: "m1" } }),
      delete: async () => ({ code: 0 })
    }
  }
};
const session = new StreamingSession(client, { domain: "feishu", appId: "a", appSecret: "s" }, () => {});
session.requestCardKit = async (path, operation, method, body) => {
  const payload = typeof body === "function" ? body() : body;
  calls.push({ path, operation, method, payload });
  if (path === "" && method === "POST") return { code: 0, data: { card_id: "c1" } };
  return { code: 0 };
};

await session.start("chat1", "chat_id", { header: { title: "Bot" } });
const createCall = calls.find((call) => call.path === "" && call.method === "POST");
if (!createCall) throw new Error("create call missing");
const cardJson = JSON.parse(createCall.payload.data);
const elements = cardJson.body.elements;
const indexOf = (id) => elements.findIndex((el) => el.element_id === id);

ok("card keeps a content element", elements.some((el) => el.element_id === "content"));
ok("card adds a dedicated progress element", elements.some((el) => el.tag === "markdown" && el.element_id === "progress"));
ok("card separates content and panel with a divider", elements.some((el) => el.tag === "hr" && el.element_id === "divider") && indexOf("divider") > indexOf("content") && indexOf("divider") < indexOf("detailspanel"));
ok("card adds a collapsible details panel", elements.some((el) => el.tag === "collapsible_panel" && el.element_id === "detailspanel"));
ok("card has no legacy status element", !elements.some((el) => el.element_id === "status"));
ok("details panel starts collapsed", elements.find((el) => el.element_id === "detailspanel")?.expanded === false);
ok("streaming_mode remains enabled", cardJson.config?.streaming_mode === true);

ok("progress write is element-scoped", await session.updateProgress("<font color='grey'>⏳ 2 个工具</font>") === true);
const progressCall = calls.find((call) => call.path.includes("/elements/progress/content"));
ok("progress write targets the progress element", progressCall?.path === "/c1/elements/progress/content" && progressCall?.method === "PUT");
ok("progress payload carries the grey status line", progressCall?.payload?.content === "<font color='grey'>⏳ 2 个工具</font>");
ok("progress write dedupes identical text", await session.updateProgress("<font color='grey'>⏳ 2 个工具</font>") === true && calls.filter((call) => call.path.includes("/elements/progress/content")).length === 1);
ok("progress can be cleared with a zero-width space", await session.updateProgress("\u200B") === true && calls.filter((call) => call.path.includes("/elements/progress/content")).length === 2);

ok("details write is element-scoped", await session.updateDetails("- 💻 终端 ×2") === true);
const detailCall = calls.find((call) => call.path.includes("detailspanel_body"));
ok("details write uses nested body element", detailCall?.path === "/c1/elements/detailspanel_body/content");
ok("details payload carries grouped row", detailCall?.payload?.content === "- 💻 终端 ×2");

const result = await session.closeWithResult("answer", { statusLine: "<font color='grey'>✅ 完成</font>" });
ok("close reports visible reply", result.visibleReplySent === true);
ok("close returns final content", result.content === "answer");
const contentCall = calls.find((call) => call.path.includes("/elements/content") && call.method === "PUT");
ok("final content write exists", contentCall?.payload?.content === "answer");
ok("final content does not carry the status line", !String(contentCall?.payload?.content ?? "").includes("✅ 完成"));
const closeProgress = calls.filter((call) => call.path === "/c1/elements/progress/content").pop();
ok("close writes the final status line to progress", closeProgress?.payload?.content === "<font color='grey'>✅ 完成</font>");
const settingsCall = calls.find((call) => call.path.endsWith("/settings"));
ok("close disables streaming mode", settingsCall?.payload?.settings?.includes('"streaming_mode":false'));

// close with an empty details panel removes panel + divider
calls.length = 0;
const session2 = new StreamingSession(client, { domain: "feishu", appId: "a", appSecret: "s" }, () => {});
session2.requestCardKit = async (path, operation, method, body) => {
  const payload = typeof body === "function" ? body() : body;
  calls.push({ path, operation, method, payload });
  if (path === "" && method === "POST") return { code: 0, data: { card_id: "c2" } };
  return { code: 0 };
};
await session2.start("chat1", "chat_id", {});
await session2.closeWithResult("answer", { statusLine: "<font color='grey'>✅ 完成</font>", details: "empty" });
ok("empty details panel is deleted at close", calls.some((call) => call.path === "/c2/elements/detailspanel" && call.method === "DELETE"));
ok("divider is deleted together with the empty panel", calls.some((call) => call.path === "/c2/elements/divider" && call.method === "DELETE"));

// close with a column_set details body replaces the nested element
calls.length = 0;
const session3 = new StreamingSession(client, { domain: "feishu", appId: "a", appSecret: "s" }, () => {});
session3.requestCardKit = async (path, operation, method, body) => {
  const payload = typeof body === "function" ? body() : body;
  calls.push({ path, operation, method, payload });
  if (path === "" && method === "POST") return { code: 0, data: { card_id: "c3" } };
  return { code: 0 };
};
const columns = { tag: "column_set", element_id: "detailspanel_body", columns: [{ tag: "column", elements: [{ tag: "markdown", content: "**共 2 个工具**" }] }] };
await session3.start("chat1", "chat_id", {});
await session3.closeWithResult("answer", { details: columns, detailsFallback: "- 💻 终端" });
const replaceCall = calls.find((call) => call.path === "/c3/elements/detailspanel_body" && call.method === "PUT");
ok("final details use the element replace endpoint", replaceCall !== undefined);
ok("final details payload is a column_set", String(replaceCall?.payload?.element ?? "").includes('"column_set"'));

ok("streaming throttle is 250ms", src.includes("const STREAMING_UPDATE_THROTTLE_MS = 250;"));
ok("punctuation no longer forces a flush", !src.includes("/[\\n。！？!?；;：:]$/") && src.includes("nextText.length - previousText.length >= STREAMING_SIGNIFICANT_DELTA_CHARS;"));

// ---- streaming window expiry (200850 card streaming timeout / 300309) ----
const timedOutError = new Error("Update card element progress failed: ErrMsg: card streaming timeout;  (code=200850)");
timedOutError.feishuCode = 200850;
const closedModeError = new Error("Update card element progress failed: ErrMsg: streaming mode is closed;  (code=300309)");
closedModeError.feishuCode = 300309;

ok("card streaming timeout is terminal", isStreamingClosedError(timedOutError) && !isRetryableCardKitError(timedOutError));
ok("closed streaming mode is terminal", isStreamingClosedError(closedModeError) && !isRetryableCardKitError(closedModeError));
ok("plain network timeouts stay retryable", !isStreamingClosedError({ message: "request timeout" }) && isRetryableCardKitError({ message: "request timeout" }));
ok("rate limits stay retryable", isRetryableCardKitError({ feishuCode: 429 }));

calls.length = 0;
let expiredDeletes = 0;
const expiredLogs = [];
const expiredClient = {
  im: {
    message: {
      create: async () => ({ code: 0, data: { message_id: "m4" } }),
      delete: async () => {
        expiredDeletes += 1;
        return { code: 0 };
      }
    }
  }
};
const expiredSession = new StreamingSession(expiredClient, { domain: "feishu", appId: "a", appSecret: "s" }, (line) => expiredLogs.push(line));
expiredSession.requestCardKit = async (path, operation, method) => {
  calls.push({ path, operation, method });
  if (path === "" && method === "POST") return { code: 0, data: { card_id: "c4" } };
  throw timedOutError;
};
await expiredSession.start("chat1", "chat_id", {});
ok("write on an expired card fails once", (await expiredSession.updateProgress("<font color='grey'>⏳ 27 个工具</font>")) === false);
const callsAfterFirstFailure = calls.length;
ok("expired session stops element writes", (await expiredSession.updateDetails("- 💻 终端 ×2")) === false && (await expiredSession.updateProgress("\u200B")) === false && calls.length === callsAfterFirstFailure);
await expiredSession.update("later token");
ok("expired session stops content writes", calls.length === callsAfterFirstFailure);
ok("expiry is logged once", expiredLogs.filter((line) => line.includes("Streaming card expired")).length === 1);
const expiredResult = await expiredSession.closeWithResult("answer");
ok("expired close reports no visible reply", expiredResult.visibleReplySent === false);
ok("frozen card is deleted at close", expiredDeletes === 1);
ok("expired close does not patch card settings", !calls.some((call) => call.path.endsWith("/settings")));
ok("expired close logs the drop", expiredLogs.some((line) => line.includes("Dropped expired streaming card")));

finish("2026.11.1 streaming-session shape");
