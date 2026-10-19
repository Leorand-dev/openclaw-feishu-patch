import pathlib
# narration test assistant assertion
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("assistant start clears status/ticker", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src));'
new='ok("assistant start clears transient status (keeps tool waiting line)", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src) && /const clearTransientStatusLines = \\(\\) => \\{/.test(src));'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")

# wayC assistant assertion
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-wayC-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("assistant message start clears status/ticker", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);\\s*return false;\\s*\\} : void 0,/.test(src));'
new='ok("assistant start clears transient status, preserves tool waiting line", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);\\s*return false;\\s*\\} : void 0,/.test(src) && /const clearTransientStatusLines = \\(\\) => \\{/.test(src));'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")

# audit: add symbol + waiting persistence assertion
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\audit-agg-105.mjs")
t=p.read_text(encoding="utf-8")
old='"clearCardStatusLines",'
new='"clearCardStatusLines",\n  "clearTransientStatusLines",'
assert old in t
t=t.replace(old,new,1)
anchor='ok("idle hold uses running total", /const hasToolActivity = aggregatedToolTotal > 0;/.test(src));'
add='ok("waiting line persists across assistant starts", /if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else clearCardStatusLines\\(\\);/.test(src));\nok("transient clear keeps waiting line", /const clearTransientStatusLines = \\(\\) => \\{\\s*itemStatusLine = "";\\s*compactionLine = "";\\s*narrationLine = "";/.test(src));\n'
assert anchor in t
t=t.replace(anchor,add+anchor,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("tests updated")
