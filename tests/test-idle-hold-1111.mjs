// Behavior tests for the bounded idle-hold timer added in batch5.
import { loadBundle } from "./_harness.mjs";

const src = loadBundle();
const start = src.indexOf("const buildHeldStatusLine");
const end = src.indexOf("const aggregateToolSummary", start);
if (start < 0 || end < 0) throw new Error("idle hold block missing");

const block = src.slice(start, end);
const factory = new Function([
  "let aggregatedToolTotal = 2;",
  "let streamText = '';",
  "let streaming = { isActive: () => true };",
  "let idleHoldTimer = null;",
  "let idleHoldRenewals = 0;",
  "let idleHeldClose = false;",
  "let queued = 0;",
  "const queueIdleSideEffects = async () => { queued += 1; };",
  "const params = { runtime: { error: () => {} } };",
  "const account = { accountId: 'a' };",
  "const timers = [];",
  "const setTimeout = (fn) => { const handle = { fn, cleared: false, unref() {} }; timers.push(handle); return handle; };",
  "const clearTimeout = (handle) => { if (handle) handle.cleared = true; };",
  "const CARD_IDLE_HOLD_MS = 8e3;",
  "const CARD_IDLE_HOLD_MAX_RENEWALS = 2;",
  block,
  "return {",
  "  scheduleIdleHold, refreshIdleHold, clearIdleHold,",
  "  fire: () => { const timer = timers.find((item) => !item.cleared); if (!timer) throw new Error('no active timer'); timer.cleared = true; timer.fn(); },",
  "  state: () => ({ idleHoldTimer, idleHoldRenewals, idleHeldClose, queued, line: buildHeldStatusLine() }),",
  "  setStream: (value) => { streamText = value; }",
  "};"
].join("\n"));
const hold = factory();

const results = [];
const ok = (name, pass) => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
};

hold.scheduleIdleHold();
ok("hold arms an unref'd timer", hold.state().idleHoldTimer !== null && hold.state().queued === 0);
hold.fire();
ok("first expiry re-arms instead of closing", hold.state().idleHoldRenewals === 1 && hold.state().queued === 0);
hold.fire();
ok("second expiry re-arms instead of closing", hold.state().idleHoldRenewals === 2 && hold.state().queued === 0);
hold.fire();
const closed = hold.state();
ok("bounded expiry closes once with held flag", closed.queued === 1 && closed.idleHeldClose === true);
ok("held close line is neutral, not completion", closed.line.includes("处理中") && !closed.line.includes("完成"));

const restored = hold.state();
hold.setStream("answer");
hold.scheduleIdleHold();
hold.setStream("");
hold.refreshIdleHold();
ok("activity refresh resets the renewal budget", hold.state().idleHoldRenewals === 0 && hold.state().idleHoldTimer !== null);

const failed = results.filter((value) => !value).length;
console.log(`\n${results.length - failed} passed, ${failed} failed (2026.10.10 idle-hold)`);
process.exitCode = failed === 0 ? 0 : 1;
