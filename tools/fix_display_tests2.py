import pathlib
# wayB waiting template
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-wayB-105.mjs")
t=p.read_text(encoding="utf-8")
lines=t.split("\n")
for i,l in enumerate(lines):
    if "waiting template present" in l:
        lines[i]='ok("waiting template present", src.includes(\'resolveProgressText("toolWaiting", "\\\\u23F3 \\\\u5df2\\\\u6267\\\\u884c {count} \\\\u4e2a\\\\u5de5\\\\u5177")\') && src.includes("const details = [];"));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")

# narration final pattern
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("final content clears status/ticker", /if \\(info\\?\\.kind === "final"\\) \\{\\s*renderEpoch \\+= 1;\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src));'
new='ok("final content clears status/ticker", /if \\(info\\?\\.kind === "final"\\) \\{\\s*renderEpoch \\+= 1;\\s*clearWaitingRefreshTimer\\(\\);\\s*toolPhaseStartedAt = 0;\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src));'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")

# display buildWaitingLine sandbox: include formatElapsedDuration
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
old='''{
  const bwl = extractArrow(src, "buildWaitingLine");
  const fn = new Function(`
let waitingLine = "", lastToolLabel = "Read", toolPhaseStartedAt = 0;
const SHOW_LAST_TOOL_LABEL = true, SHOW_TOOL_ELAPSED = true;
const resolveProgressText = (key, fallback) => fallback;
${bwl}
return { build: buildWaitingLine, start: (ms) => { toolPhaseStartedAt = Date.now() - ms; } };
`)();'''
new='''{
  const fmtBody = extractArrow(src, "formatElapsedDuration");
  const bwl = extractArrow(src, "buildWaitingLine");
  const fn = new Function(`
let waitingLine = "", lastToolLabel = "Read", toolPhaseStartedAt = 0;
const SHOW_LAST_TOOL_LABEL = true, SHOW_TOOL_ELAPSED = true;
const resolveProgressText = (key, fallback) => fallback;
${fmtBody}
${bwl}
return { build: buildWaitingLine, start: (ms) => { toolPhaseStartedAt = Date.now() - ms; } };
`)();'''
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("fixed")
