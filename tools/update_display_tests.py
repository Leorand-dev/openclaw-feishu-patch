import pathlib

# ---------- wayB sandbox ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-wayB-105.mjs")
t=p.read_text(encoding="utf-8")
old="let aggregatedToolTotal = 0;\nlet lastToolLabel = \"\";"
new="let aggregatedToolTotal = 0;\nlet lastToolLabel = \"\";\nlet toolPhaseStartedAt = 0;\nconst scheduleWaitingRefresh = () => {};"
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")

# ---------- wayC ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-wayC-105.mjs")
t=p.read_text(encoding="utf-8")
lines=t.split("\n")
for i,l in enumerate(lines):
    if "assistant start clears transient status, preserves tool waiting line" in l:
        lines[i]='ok("assistant start clears transient status / keeps initial status when blank", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\) \\|\\| narrationLine\\) clearCardStatusLines\\(\\);\\s*else if \\(!prewarmStatusLine && !waitingLine\\) \\{/.test(src) && /const clearTransientStatusLines = \\(\\) => \\{/.test(src));'
    if "status renderer joins structured fields" in l:
        lines[i]='ok("status renderer joins structured fields", /const primary = waitingLine \\|\\| itemStatusLine \\|\\| compactionLine \\|\\| narrationLine;/.test(src) && /const secondary = extras\\.length > 0/.test(src));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")

# ---------- idle aggregator regex ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-idle-release-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace('ok("aggregator clears pending timer", /aggregatedToolTotal \\+= 1;[\\s\\S]{0,160}clearIdleCloseTimer\\(\\);/.test(src));','ok("aggregator clears pending timer", /aggregatedToolTotal \\+= 1;[\\s\\S]{0,320}clearIdleCloseTimer\\(\\);/.test(src));',1)
p.write_text(t,encoding="utf-8",newline="\n")

# ---------- narration ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace("const NARRATION_MAX_CHARS = 240;\nconst STATUS_MAX_CHARS = 600;","const NARRATION_MAX_CHARS = 240;\nconst STATUS_LINE_MAX_CHARS = 160;\nconst STATUS_MAX_CHARS = 400;",1)
t=t.replace('ok("narration sits above answer in card", sandbox.renderCard() === "answer\\n\\n💬 first narration", JSON.stringify(sandbox.renderCard()));','ok("narration sits above answer in card", sandbox.renderCard() === "answer\\n\\n💬 first narration", JSON.stringify(sandbox.renderCard()));',1)
t=t.replace('ok("status renderer includes narration", /const parts = \\[waitingLine, narrationLine, itemStatusLine, compactionLine\\]/.test(src));','ok("status renderer includes narration", /const primary = waitingLine \\|\\| itemStatusLine \\|\\| compactionLine \\|\\| narrationLine;/.test(src));',1)
t=t.replace('ok("assistant start clears transient status (keeps tool waiting line)", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src) && /const clearTransientStatusLines = \\(\\) => \\{/.test(src));','ok("assistant start keeps initial status when blank", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\) \\|\\| narrationLine\\) clearCardStatusLines\\(\\);\\s*else if \\(!prewarmStatusLine && !waitingLine\\) \\{/.test(src));',1)
p.write_text(t,encoding="utf-8",newline="\n")

# ---------- display ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace('ok("status budget configured", /STATUS_MAX_CHARS = 600;/.test(src));','ok("compact status budget configured", /STATUS_LINE_MAX_CHARS = 160;/.test(src) && /STATUS_MAX_CHARS = 400;/.test(src));',1)
t=t.replace('const STATUS_MAX_CHARS = 600;','const STATUS_LINE_MAX_CHARS = 160;\nconst STATUS_MAX_CHARS = 400;',1)
t=t.replace('ok("status order: waiting/narration/item/compaction", statusFn() === "waiting\\n\\nnarration\\n\\nitem\\n\\ncompact", JSON.stringify(statusFn()));','ok("compact status: waiting + one secondary line", statusFn() === "waiting\\nnarration · item · compact", JSON.stringify(statusFn()));',1)
# append extra batch1 checks before finish
anchor='finish("2026.10.5 display/backfill/session");'
extra='''// ---------- 5) display batch 1: compact status, elapsed/last tool, narration cap, timer ----------
ok("narration max configurable and default 120", /const configured = Number\\(account\\.config\\?\\.narrationMaxChars\\);\s*return Number\\.isFinite\\(configured\\) && configured >= 40 && configured <= 500 \\? configured : 120;/.test(src));
ok("status lines use single newline", /return truncateDisplayText\\(lines\\.join\\("\\\\n"\\), STATUS_MAX_CHARS\\)/.test(src));
ok("waiting line has last-tool detail", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /const details = \\[\\];/.test(src));
ok("waiting line has elapsed detail", /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /formatElapsedDuration\\(elapsedMs\\)/.test(src));
ok("elapsed refresh timer 5s", /TOOL_ELAPSED_REFRESH_MS = 5e3;/.test(src) && /scheduleWaitingRefresh\\(\\);/.test(src));
ok("elapsed timer cleared on final/close/reply", (src.match(/clearWaitingRefreshTimer\\(\\);/g) || []).length >= 4);
ok("assistant start keeps initial status when blank", /else if \\(!prewarmStatusLine && !waitingLine\\) \\{\\s*prewarmStatusLine = resolveProgressText\\("processing"/.test(src));
{
  const fmt = extractArrow(src, "formatElapsedDuration");
  const f = new Function(`${fmt}\\nreturn formatElapsedDuration;`)();
  ok("format elapsed seconds", f(0) === "0s" && f(59_000) === "59s");
  ok("format elapsed minutes", f(60_000) === "1m00s" && f(125_000) === "2m05s");
}
{
  const bwl = extractArrow(src, "buildWaitingLine");
  const fn = new Function(`
let waitingLine = "", lastToolLabel = "Read", toolPhaseStartedAt = 0;
const SHOW_LAST_TOOL_LABEL = true, SHOW_TOOL_ELAPSED = true;
const resolveProgressText = (key, fallback) => fallback;
${bwl}
return { build: buildWaitingLine, start: (ms) => { toolPhaseStartedAt = Date.now() - ms; } };
`)();
  ok("waiting line includes last tool", fn.build(3) === "⏳ 已执行 3 个工具 · 最后：Read", fn.build(3));
  fn.start(12_000);
  const line = fn.build(3);
  ok("waiting line includes elapsed", /12s/.test(line) && line.includes("最后：Read"), line);
}

'''
assert anchor in t
t=t.replace(anchor,extra+anchor,1)
# import extractArrow
t=t.replace('import { loadBundle, makeCounter } from "./_harness.mjs";','import { loadBundle, extractArrow, makeCounter } from "./_harness.mjs";',1)
p.write_text(t,encoding="utf-8",newline="\n")

# ---------- audit ----------
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\audit-agg-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace('ok("status renderer combines fields", /const parts = \\[waitingLine, narrationLine, itemStatusLine, compactionLine\\]/.test(src));','ok("status renderer combines fields", /const primary = waitingLine \\|\\| itemStatusLine \\|\\| compactionLine \\|\\| narrationLine;/.test(src) && /const secondary = extras\\.length > 0/.test(src));',1)
t=t.replace('ok("optional last-tool label", /showLastToolLabel === true && lastToolLabel/.test(src));','ok("optional last-tool label", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src));',1)
t=t.replace('ok("status budget present", /const STATUS_MAX_CHARS = 600;/.test(src));','ok("compact status budget present", /const STATUS_LINE_MAX_CHARS = 160;/.test(src) && /const STATUS_MAX_CHARS = 400;/.test(src));',1)
t=t.replace('ok("waiting string intact", src.includes("\\\\u23F3 \\\\u5df2\\\\u6267\\\\u884c {count} \\\\u4e2a\\\\u5de5\\\\u5177\\\\uff0c\\\\u7b49\\\\u5f85\\\\u4e2d\\\\u2026"));','ok("waiting string intact", src.includes("\\\\u23F3 \\\\u5df2\\\\u6267\\\\u884c {count} \\\\u4e2a\\\\u5de5\\\\u5177") && src.includes("\\\\uff0c\\\\u7b49\\\\u5f85\\\\u4e2d\\\\u2026"));\nok("waiting line shows last tool / elapsed", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /TOOL_ELAPSED_REFRESH_MS = 5e3;/.test(src));',1)
t=t.replace('ok("waiting line persists across assistant starts", /if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else clearCardStatusLines\\(\\);/.test(src));','ok("waiting line persists across assistant starts", /if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\) \\|\\| narrationLine\\) clearCardStatusLines\\(\\);/.test(src));',1)
t=t.replace('ok("narration ticker state present", src.includes(\'let narrationLine = "";\') && src.includes("const NARRATION_MAX_CHARS = 240;"));','ok("narration ticker state present", src.includes(\'let narrationLine = "";\') && /narrationMaxChars/.test(src) && /configured : 120;/.test(src));',1)
# add symbols
old='"clearTransientStatusLines",'
new='"clearTransientStatusLines",\n  "formatElapsedDuration",\n  "clearWaitingRefreshTimer",\n  "scheduleWaitingRefresh",'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("tests patched")
