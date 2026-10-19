import pathlib

# idle
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-idle-release-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace('/const performStreamingClose = async[\\s\\S]{0,120}clearIdleCloseTimer\\(\\);/','/const performStreamingClose = async[\\s\\S]{0,300}clearIdleCloseTimer\\(\\);/',1)
t=t.replace('/let text = resolveFinalCardText\\(finalizedReasoningText, finalizedAnswerText\\);/','/let text = resolveFinalCardText\\(finalReasoningText, finalizedAnswerText\\);/',1)
p.write_text(t,encoding="utf-8",newline="\n")

# display
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("status element only when enabled", /if \\(this\\.statusElementEnabled\\) elements\\.push\\(\\{\\s*tag: "markdown",\\s*content: "",\\s*element_id: "status"/.test(src));'
new='ok("status element only when enabled / position configurable", /element_id: "status"/.test(src) && /this\\.statusElementEnabled && this\\.statusPosition === "top"/.test(src) && /this\\.statusElementEnabled && this\\.statusPosition !== "top"/.test(src));'
assert old in t
t=t.replace(old,new,1)
old2='ok("elapsed refresh timer 5s", /TOOL_ELAPSED_REFRESH_MS = 5e3;/.test(src) && /scheduleWaitingRefresh\\(\\);/.test(src));'
new2='ok("elapsed refresh timer configurable, default 15s", /toolElapsedRefreshMs/.test(src) && /configured >= 5e3 && configured <= 6e4 \\? configured : 15e3/.test(src) && /if \\(!SHOW_TOOL_ELAPSED \\|\\| waitingRefreshTimer/.test(src) && /scheduleWaitingRefresh\\(\\);/.test(src));'
assert old2 in t
t=t.replace(old2,new2,1)
anchor='finish("2026.10.5 display/backfill/session");'
extra='''// ---------- 6) display batch 2: status position, reasoning cap/final hide, final summary ----------
ok("status position config exists", /cardStatusPosition === "top" \\? "top" : "bottom"/.test(src));
ok("status position passed to session", /statusPosition \\}/.test(src) && /this\\.statusPosition === "top" \\? "top" : "bottom";/.test(src));
ok("reasoning max lines configurable (default 12)", /reasoningMaxLines/.test(src) && /configured >= 2 && configured <= 100 \\? configured : 12/.test(src));
ok("reasoning preview adds ellipsis when capped", /lines\\.length > REASONING_MAX_LINES \\? \\[\\.\\.\\.lines\\.slice\\(0, Math\\.max\\(1, REASONING_MAX_LINES - 1\\)\\), "\\u2026"\\] : lines/.test(src));
ok("final hides reasoning by default", /HIDE_REASONING_IN_FINAL = account\\.config\\?\\.hideReasoningInFinal !== false;/.test(src) && /const finalReasoningText = HIDE_REASONING_IN_FINAL && finalizedAnswerText\\.trim\\(\\) \\? "" : finalizedReasoningText;/.test(src));
ok("optional final tool summary (default off)", /FINAL_TOOL_SUMMARY = account\\.config\\?\\.finalToolSummary === true;/.test(src) && /finalToolSummary/.test(src));
{
  const fmtBody = extractArrow(src, "formatReasoningPrefix");
  const fmt = new Function(`
const REASONING_MAX_LINES = 12;
${fmtBody}
return formatReasoningPrefix;
`)();
  const input = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\\n");
  const out = fmt(input);
  const bodyLines = out.split("\\n").filter((l) => l.startsWith("> ") && !l.includes("Thinking"));
  ok("reasoning preview capped to 12 lines", bodyLines.length === 12, `lines=${bodyLines.length}`);
  ok("reasoning preview ends with ellipsis", bodyLines.at(-1) === "> …", JSON.stringify(bodyLines.slice(-2)));
  ok("reasoning preview keeps first lines", out.includes("line 1") && !out.includes("line 30"));
}

'''
assert anchor in t
t=t.replace(anchor,extra+anchor,1)
p.write_text(t,encoding="utf-8",newline="\n")

# audit
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\audit-agg-105.mjs")
t=p.read_text(encoding="utf-8")
t=t.replace('ok("card JSON has status element", /element_id: "status"/.test(src) && /this\\.statusElementEnabled\\) elements\\.push\\(\\{/.test(src));','ok("card JSON has status element", /element_id: "status"/.test(src) && /this\\.statusElementEnabled && this\\.statusPosition === "top"/.test(src) && /this\\.statusElementEnabled && this\\.statusPosition !== "top"/.test(src));',1)
t=t.replace('ok("waiting line shows last tool / elapsed", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /TOOL_ELAPSED_REFRESH_MS = 5e3;/.test(src));','ok("waiting line shows last tool / elapsed", /SHOW_LAST_TOOL_LABEL && lastToolLabel/.test(src) && /SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0/.test(src) && /configured >= 5e3 && configured <= 6e4 \\? configured : 15e3/.test(src));',1)
anchor='ok("empty prewarmed card is discarded"'
extra='''ok("status position configurable", /cardStatusPosition === "top" \\? "top" : "bottom"/.test(src));
ok("reasoning preview cap / final hide", /REASONING_MAX_LINES/.test(src) && /HIDE_REASONING_IN_FINAL/.test(src) && /finalReasoningText/.test(src));
ok("final tool summary optional", /FINAL_TOOL_SUMMARY = account\\.config\\?\\.finalToolSummary === true;/.test(src));
'''
assert anchor in t
t=t.replace(anchor, extra+anchor, 1)
# add symbols
old='"scheduleWaitingRefresh",'
new='"scheduleWaitingRefresh",\n  "REASONING_MAX_LINES",\n  "HIDE_REASONING_IN_FINAL",\n  "FINAL_TOOL_SUMMARY",'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("tests batch2 patched")
