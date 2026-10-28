// Streamed-text boundary model — up to 2026.10.7 the plugin guessed snapshot
// boundaries with a length/overlap heuristic; 2026.10.8 (PR #182438) freezes the
// prior prose at onAssistantMessageStart and replaces only the current message.
// This suite pins whichever model the bundle under test carries, and checks the
// Card JSON 2.0 action-card container fix (PR #79832) for 2026.10.8.
import { loadBundle, makeCounter } from "./_harness.mjs";

const src = loadBundle();
const { ok, finish } = makeCounter();

const modern = !src.includes("lastSnapshotTextLength");

// --- model selection --------------------------------------------------------
ok(modern ? "boundary model: 2026.10.8 frozen prefix" : "boundary model: legacy overlap heuristic", true);

if (modern) {
  // --- upstream boundary semantics are present, the old heuristic is gone ---
  ok("snapshot updates replace the current message", src.includes("else streamText = `${snapshotBaseText}${nextText}`;"));
  ok("old length/overlap heuristic removed", !src.includes("lastSnapshotTextLength") && !src.includes("currentSnapshotText"));
  ok(
    "assistant start freezes the prior prose",
    /onAssistantMessageStart: previewStreamingEnabled \? \(\) => \{[\s\S]*?snapshotBaseText = streamText \? `\$\{streamText\}\\n\\n` : "";[\s\S]*?lastPartial = "";/.test(src)
  );
  ok("final text reuses the frozen prefix", src.includes("payload.isError ? reply.text : `${snapshotBaseText}${reply.text}`"));
  ok(
    "final branch keeps the frozen prefix",
    /if \(info\?\.kind === "final"\) \{\s*streamText = text;\s*hasStreamingFinalText = true;\s*flushCardUpdate\(\);/.test(src)
  );
  ok("producer callback order preserved", src.includes("preserveProgressCallbackStartOrder: previewStreamingEnabled ? true : void 0,"));
  ok("boundary reset only in the turn reset", (src.match(/snapshotBaseText = "";/g) || []).length === 2);

  // --- our block dedupe still owns block payloads ---------------------------
  ok("block payloads still use dedupe merge", src.includes('if (info?.kind === "block") queueStreamingBlockUpdate(text);'));
  ok(
    "block merge keeps the boundary",
    /const queueStreamingBlockUpdate = \(nextText\) => \{[\s\S]*?streamText = mergeStreamingText\(streamText, nextText\);[\s\S]*?lastPartial = nextText;[\s\S]*?flushCardUpdate\(\);/.test(src) &&
      !/streamText = mergeStreamingText\(streamText, nextText\);\s*snapshotBaseText = "";/.test(src)
  );
  ok("mergeStreamingText helper retained", src.includes("function mergeStreamingText(previousText, nextText) {"));

  // --- behaviour: frozen prefix + overlap merge compose without duplication -
  {
    const start = src.indexOf("function mergeStreamingText(");
    const end = src.indexOf("\n}\n", start) + 3;
    const merge = new Function(`${src.slice(start, end)}\nreturn mergeStreamingText;`)();
    const base = "\u7b2c\u4e00\u6bb5\n\n";
    ok("current message is not appended twice", merge(base + "\u7b2c\u4e8c\u6bb5", "\u7b2c\u4e8c\u6bb5") === base + "\u7b2c\u4e8c\u6bb5");
    ok("growing block text replaces the shorter copy", merge("\u7b2c\u4e8c\u6bb5\u524d", "\u7b2c\u4e8c\u6bb5\u524d\u534a") === "\u7b2c\u4e8c\u6bb5\u524d\u534a");
    ok("genuinely new content is appended", merge(base + "\u7b2c\u4e8c\u6bb5", "\u7b2c\u4e09\u6bb5") === base + "\u7b2c\u4e8c\u6bb5\u7b2c\u4e09\u6bb5");
  }

  // --- quick-action/confirmation card container fix (PR #79832) ------------
  ok("action cards use Card JSON 2.0 column_set", src.includes('tag: "column_set"') && src.includes("columns: params.actions.map((button) => ({"));
  ok("legacy action container gone", !src.includes('tag: "action"'));
} else {
  // --- pre-10.8 frozen builds keep their reviewed heuristic ----------------
  ok("legacy heuristic still patched in", src.includes("let lastSnapshotTextLength = 0;") && src.includes("currentSnapshotText"));
  ok("legacy block dedupe still present", src.includes('if (info?.kind === "block") queueStreamingBlockUpdate(text);'));
  ok(
    "legacy block merge resets the snapshot base",
    /streamText = mergeStreamingText\(streamText, nextText\);\s*snapshotBaseText = "";/.test(src)
  );
  ok("legacy assistant start has no frozen prefix", !src.includes("snapshotBaseText = streamText ?"));
  ok("legacy final branch resets the snapshot base", /if \(info\?\.kind === "final"\) \{\s*streamText = text;\s*hasStreamingFinalText = true;\s*snapshotBaseText = "";/.test(src));
  ok("legacy callback-order option absent", !src.includes("preserveProgressCallbackStartOrder"));
  ok("legacy action container retained", src.includes('tag: "action"'));
}

// --- block updates: dedupe growth, replace authoritative shorter snapshots --
{
  const blockStart = src.indexOf("const queueStreamingBlockUpdate = (nextText) => {");
  const blockEnd = src.indexOf("\n\t};", blockStart) + 4;
  const blockBody = src.slice(blockStart, blockEnd);
  const mergeStart = src.indexOf("function mergeStreamingText(");
  const mergeEnd = src.indexOf("\n}\n", mergeStart) + 3;
  const mergeBody = src.slice(mergeStart, mergeEnd);
  const makeBlockSandbox = () => new Function(`
let streamText = "", snapshotBaseText = "", lastSnapshotTextLength = 0, lastPartial = "";
let flushes = 0;
${mergeBody}
const flushCardUpdate = () => { flushes += 1; };
${blockBody}
return {
  update: queueStreamingBlockUpdate,
  setBase: (b) => { snapshotBaseText = b; },
  setText: (t) => { streamText = t; },
  text: () => streamText,
  flushes: () => flushes
};
`)();
  const dup = makeBlockSandbox();
  dup.setText("\u7b2c\u4e00\u6bb5\n\n\u7b2c\u4e8c\u6bb5");
  dup.update("\u7b2c\u4e8c\u6bb5");
  ok("block duplicate snapshot is not appended", dup.text() === "\u7b2c\u4e00\u6bb5\n\n\u7b2c\u4e8c\u6bb5", dup.text());

  const grow = makeBlockSandbox();
  grow.setText("\u7b2c\u4e00\u6bb5");
  grow.update("\u7b2c\u4e00\u6bb5\u524d\u534a");
  ok("growing block snapshot replaces the shorter copy", grow.text() === "\u7b2c\u4e00\u6bb5\u524d\u534a", grow.text());

  const shrink = makeBlockSandbox();
  shrink.setBase("\u524d\u6587\n\n");
  shrink.setText("\u524d\u6587\n\n\u7b2c\u4e00\u6bb5\u524d\u534a");
  shrink.update("\u53e6\u4e00\u6bb5");
  ok("shorter corrected snapshot replaces the current message", shrink.text() === "\u524d\u6587\n\n\u53e6\u4e00\u6bb5", shrink.text());
  ok("corrected snapshot still flushes", shrink.flushes() === 1);

  const append = makeBlockSandbox();
  append.update("block A");
  append.update("block B");
  ok("genuinely new block content is appended", append.text() === "block Ablock B", append.text());
}

finish(modern ? "2026.10.8 streamed-text boundary / action card" : "pre-10.8 streamed-text heuristic");
