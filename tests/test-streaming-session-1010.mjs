// 2026.10.10 batch5 — CardKit session shape: content + details panel, no status element.
import { loadBundle, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const classStart = src.indexOf("var FeishuStreamingSession = class {");
const classEnd = src.indexOf("// extensions/feishu/src/streaming-update.ts", classStart);
if (classStart < 0 || classEnd < 0) throw new Error("FeishuStreamingSession not found");
const classSrc = src.slice(classStart, classEnd);

const Session = new Function([
  "const STREAMING_UPDATE_THROTTLE_MS = 160;",
  "const STREAMING_SIGNIFICANT_DELTA_CHARS = 18;",
  "const CARD_WRITE_RETRY_MAX_ATTEMPTS = 3;",
  "const CARD_WRITE_RETRY_BASE_DELAY_MS = 1;",
  "const isRetryableCardKitError = () => false;",
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
  "class FeishuStreamingFinalizationError extends Error { constructor(cause, result) { super(String(cause)); this.cause = cause; this.result = result; } }",
  classSrc,
  "return FeishuStreamingSession;"
].join("\n"));
const StreamingSession = new Session();

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

ok("card keeps a content element", elements.some((el) => el.element_id === "content"));
ok("card adds a collapsible details panel", elements.some((el) => el.tag === "collapsible_panel" && el.element_id === "detailspanel"));
ok("card has no legacy status element", !elements.some((el) => el.element_id === "status"));
ok("details panel starts collapsed", elements.find((el) => el.element_id === "detailspanel")?.expanded === false);
ok("streaming_mode remains enabled", cardJson.config?.streaming_mode === true);

ok("details write is element-scoped", await session.updateDetails("- 💻 终端 ×2") === true);
const detailCall = calls.find((call) => call.path.includes("detailspanel_body"));
ok("details write uses nested body element", detailCall?.path === "/c1/elements/detailspanel_body/content");
ok("details payload carries grouped row", detailCall?.payload?.content === "- 💻 终端 ×2");

const result = await session.closeWithResult("answer");
ok("close reports visible reply", result.visibleReplySent === true);
ok("close returns final content", result.content === "answer");
const contentCall = calls.find((call) => call.path.includes("/elements/content") && call.method === "PUT");
ok("final content write exists", contentCall?.payload?.content === "answer");
const settingsCall = calls.find((call) => call.path.endsWith("/settings"));
ok("close disables streaming mode", settingsCall?.payload?.settings?.includes('"streaming_mode":false'));

finish("2026.10.10 streaming-session shape");
