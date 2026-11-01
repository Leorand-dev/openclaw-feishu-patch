// Batch 3/4: the final status summary must still be written after closeWithResult marks the session closed.
import { loadBundle, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const extractMethodBody = (signature, nextSignature) => {
  const start = src.indexOf(signature);
  if (start < 0) throw new Error(`missing method: ${signature}`);
  const end = src.indexOf(nextSignature, start);
  if (end < 0) throw new Error(`missing next method: ${nextSignature}`);
  const method = src.slice(start, end);
  const bodyStart = method.indexOf(") {") + 3;
  const bodyEnd = method.lastIndexOf("}");
  return method.slice(bodyStart, bodyEnd);
};

const statusBody = extractMethodBody(
  "\tasync writeStatusContent(text, options = {}) {",
  "\n\tasync deleteStatusElement("
);

const makeWrite = () => new Function(
  "STATUS_UPDATE_MAX_ATTEMPTS",
  "STATUS_RETRY_BASE_DELAY_MS",
  "isRetryableCardKitError",
  "delayMs",
  `return async function writeStatusContent(text, options = {}) {${statusBody}};`
)(3, 0, () => false, () => Promise.resolve());

const makeSession = (closed) => {
  const calls = [];
  return {
    calls,
    state: { cardId: "card", sequence: 0 },
    statusElementEnabled: true,
    closed,
    statusConfirmed: false,
    statusUnavailable: false,
    log: () => void 0,
    requestCardKit: async (_path, _operation, _method, body) => {
      calls.push(body());
      return {};
    }
  };
};

ok(
  "closeWithResult allows the final status write after marking closed",
  /this\.writeStatusContent\(options\.statusText, \{ allowClosed: true \}\)/.test(src)
);

{
  const session = makeSession(true);
  const write = makeWrite();
  const sent = await write.call(session, "status");
  ok("default writeStatusContent still blocks post-close updates", sent === false && session.calls.length === 0);
}

{
  const session = makeSession(true);
  const write = makeWrite();
  const sent = await write.call(session, "status", { allowClosed: true });
  ok("allowClosed permits the final post-close status write", sent === true && session.calls.length === 1);
  ok("allowClosed write still carries a fresh sequence and uuid", session.calls[0]?.sequence === 1 && typeof session.calls[0]?.uuid === "string");
}

ok(
  "failed final status clears the element instead of leaving the old text",
  /if \(!wrote\) await this\.writeStatusContent\("\\u200B", \{ allowClosed: true \}\)/.test(src)
);

ok(
  "delete-failure fallback also clears status after close",
  /if \(!deleted\) \{[\s\S]*?await this\.writeStatusContent\("\\u200B", \{ allowClosed: true \}\)/.test(src)
);

ok(
  "final completion summary is still the grey status text",
  /statusText: greyStatus\(`\$\{buildFinalSummaryLine\(finalElapsedMs\)\}\$\{pageSuffix\}`\)/.test(src)
);

finish("batch 4 close/status regression");
