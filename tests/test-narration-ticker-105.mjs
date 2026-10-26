// 2026.10.5 — option B: narration ticker (latest line in status element, cleared on final).
import { loadBundle, extractArrow, extractAsyncArrow, extractNarrationPrefix, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const truncateBody = extractArrow(src, "truncateDisplayText");
const buildBody = extractArrow(src, "buildCombinedStreamText");
const statusBody = extractArrow(src, "buildStatusText");
const activityBody = extractArrow(src, "buildActivityText");
const normalizeBody = extractArrow(src, "normalizeNarrationLine");
const deliverBody = extractAsyncArrow(src, "deliverNarrationToCard");

const makeSandbox = (deferredStart = false) => new Function(`
let streamingEnabled = true;
let renderMode = "card";
let sessionActive = true;
let renderEpoch = 0;
const streaming = { isActive: () => sessionActive };
let streamingStartPromise = null;
let releaseStart = () => {};
${deferredStart ? 'streamingStartPromise = new Promise((resolve) => { releaseStart = resolve; });' : ''}
let narrationLine = "", waitingLine = "", itemStatusLine = "", compactionLine = "";
const narrationEntries = [];
const cardStartedAt = Date.now();
const NARRATION_MAX_ENTRIES = 6;
const NARRATION_TOTAL_MAX_CHARS = 800;
const params = { runtime: { log: () => {} } };
const account = { accountId: "test" };
let reasoningText = "", streamText = "";
let finalDeliveryInProgress = false;
const NARRATION_MAX_CHARS = 240;
const STATUS_LINE_MAX_CHARS = 160;
const STATUS_MAX_CHARS = 400;
let lastToolActivityAt = 0;
let timerClears = 0;
let flushCount = 0;
let lastStatus = "";
const startStreaming = () => {};
const clearPrewarmStatus = () => {};
const clearIdleCloseTimer = () => { timerClears += 1; };
const flushCardUpdate = () => { flushCount += 1; lastStatus = buildStatusText(); };
${extractNarrationPrefix(src)}
${truncateBody}
${buildBody}
${statusBody}
${activityBody}
${normalizeBody}
${deliverBody}
return {
  normalize: normalizeNarrationLine,
  deliver: deliverNarrationToCard,
  build: (thinking, answer) => buildCombinedStreamText(thinking, answer),
  status: () => buildStatusText(),
  activity: () => buildActivityText(),
  renderCard: () => [buildActivityText(), buildCombinedStreamText(reasoningText, streamText), buildStatusText()].filter(Boolean).join("\\n\\n"),
  getLine: () => narrationLine,
  getStatus: () => lastStatus,
  flushes: () => flushCount,
  lastActivity: () => lastToolActivityAt,
  timerClears: () => timerClears,
  setAnswer: (v) => { streamText = v; },
  setActive: (v) => { sessionActive = v; },
  setEnabled: (v) => { streamingEnabled = v; },
  setRenderMode: (v) => { renderMode = v; },
  releaseStart: () => releaseStart(),
  bumpEpoch: () => { renderEpoch += 1; }
};
`)();

(async () => {
  const sandbox = makeSandbox();

  // normalization
  ok("strips 💬 prefix", sandbox.normalize("💬 hello") === "hello");
  ok("collapses whitespace", sandbox.normalize("💬  hello   world  ") === "hello world");
  ok("accepts plain text", sandbox.normalize("plain narration") === "plain narration");
  ok("blank becomes empty", sandbox.normalize("   ") === "");
  ok("null-safe", sandbox.normalize(null) === "");
  const long = sandbox.normalize("x".repeat(400));
  ok("truncates to max chars", Array.from(long).length === 240 && long.endsWith("…"), `len=${Array.from(long).length}`);
  const surrogateInput = "💬 " + "a".repeat(238) + "😀" + "b".repeat(20);
  const safe = sandbox.normalize(surrogateInput);
  const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(safe) || /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(safe);
  ok("truncation does not split surrogate pairs", !lone && Array.from(safe).length === 240, JSON.stringify(safe.slice(-4)));

  // ticker behaviour
  ok("delivers narration into card", await sandbox.deliver("💬 first narration") === true);
  ok("activity renders 💬 line", sandbox.activity().includes("💬 first narration"), sandbox.activity());
  ok("activity line itself is single-line", !sandbox.activity().includes("first narration\n"));
  ok("narration sits above answer in card", sandbox.renderCard().includes("💬 first narration") && !sandbox.renderCard().includes("answer"), JSON.stringify(sandbox.renderCard()));
  sandbox.setAnswer("answer");
  ok("activity hides after answer starts", !sandbox.renderCard().includes("💬 first narration"), JSON.stringify(sandbox.renderCard()));
  ok("narration refreshes hold activity", sandbox.lastActivity() > 0);
  ok("narration cancels pending hold timer", sandbox.timerClears() >= 1);
  const flushesAfterFirst = sandbox.flushes();
  ok("duplicate narration is deduped (no extra flush)", await sandbox.deliver("💬 first narration") === true && sandbox.flushes() === flushesAfterFirst);
  ok("latest narration replaces previous", await (async () => {
    sandbox.setAnswer("");
    await sandbox.deliver("💬 second narration");
    return sandbox.activity().includes("💬 second narration") && !sandbox.activity().includes("first narration");
  })());
  ok("flush called per changed narration", sandbox.flushes() >= 2);
  ok("activity hides once answer starts", (() => { sandbox.setAnswer("answer"); return !sandbox.activity().includes("💬"); })());

  // renderEpoch race: a clear while the card is starting must not resurrect the ticker
  const race = makeSandbox(true);
  const raceP = race.deliver("💬 stale");
  race.bumpEpoch();
  race.releaseStart();
  ok("stale narration is dropped after clear", await raceP === false);
  ok("no stale ticker is written", race.getLine() === "");

  // no card -> no crash, narration suppressed (never a bubble)
  sandbox.setActive(false);
  ok("no active card returns false", await sandbox.deliver("💬 lost") === false);
  sandbox.setActive(true);
  sandbox.setEnabled(false);
  ok("disabled streaming returns false", await sandbox.deliver("💬 x") === false);
  sandbox.setEnabled(true);
  sandbox.setRenderMode("raw");
  ok("raw mode returns false", await sandbox.deliver("💬 x") === false);
  sandbox.setRenderMode("card");

  // structural wiring
  ok("deliver routes narration into ticker", /if \(narrationPayload\) \{\s*await deliverNarrationToCard\(inputPayload\.text\);/.test(src));
  ok("content renderer excludes narration/status", /const buildCombinedStreamText = \(thinking, answer\) => \[thinking \? formatReasoningPrefix\(thinking\) : "", answer\]\.filter\(Boolean\)\.join\("\\n\\n---\\n\\n"\);/.test(src));
  ok("activity line carries latest narration", /const buildActivityText = \(\) => \{/.test(src) && /if \(streamText\.trim\(\) \|\| finalDeliveryInProgress\) return/.test(src));
  ok("final content clears status/ticker", /if \(info\?\.kind === "final"\) \{\s*renderEpoch \+= 1;\s*clearWaitingRefreshTimer\(\);\s*clearCardStatusLines\(\);\s*flushCardUpdate\(true\);/.test(src));
ok("assistant start keeps initial status when blank", /onAssistantMessageStart: previewStreamingEnabled \? \(\) => \{\s*renderEpoch \+= 1;\s*if \(aggregatedToolTotal > 0\) \{\s*clearTransientStatusLines\(\);\s*toolPhaseCompleted = true;\s*clearWaitingRefreshTimer\(\);/.test(src));
  ok("close clears status fields", /const carriedNarration = narrationLine;\s*clearCardStatusLines\(\);/.test(src));
  ok("reset/new reply clear status", /const resetStreamingState = \(\) => \{[\s\S]*?clearCardStatusLines\(\);/.test(src) && /onReplyStart: async \(\) => \{[\s\S]*?clearCardStatusLines\(\);/.test(src));
  ok("dedupe guard exists", /if \(nextLine === narrationLine && streaming\?\.isActive\(\) === true\) return true;/.test(src));
  ok("no standalone narration delivery", /return noVisibleFeishuReplyDelivery;/.test(src));
  ok("activity element exists", /element_id: "activity"/.test(src));
  ok("details timeline exists", /buildTimelinePanelContent/.test(src) && /activityTimeline/.test(src));
  ok("ticker uses safe truncation helper", /return truncateDisplayText\(collapsed, NARRATION_MAX_CHARS\);/.test(src));


  ok("narration timeline is capped", /NARRATION_MAX_ENTRIES/.test(src) && /NARRATION_TOTAL_MAX_CHARS/.test(src));
  ok("background card scheduler exists", /BACKGROUND_IDLE_CLOSE_MS/.test(src) && /scheduleBackgroundClose/.test(src));

  finish("2026.10.5 narration ticker");
})().catch((error) => {
  console.error("harness error:", error);
  process.exit(1);
});
