import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-wayC-105.mjs")
lines=p.read_text(encoding="utf-8").split("\n")
for i,l in enumerate(lines):
    if "assistant start clears transient status / keeps initial status when blank" in l:
        lines[i]='ok("assistant start clears transient status / keeps initial status when blank", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\)\\) clearCardStatusLines\\(\\);\\s*else \\{[\\s\\S]{0,400}if \\(!prewarmStatusLine && !waitingLine\\) \\{/.test(src) && /const clearTransientStatusLines = \\(\\) => \\{/.test(src));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")

p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
lines=p.read_text(encoding="utf-8").split("\n")
for i,l in enumerate(lines):
    if "assistant start keeps initial status when blank" in l:
        lines[i]='ok("assistant start keeps initial status when blank", /onAssistantMessageStart: previewStreamingEnabled \\? \\(\\) => \\{\\s*renderEpoch \\+= 1;\\s*if \\(aggregatedToolTotal > 0\\) clearTransientStatusLines\\(\\);\\s*else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\)\\) clearCardStatusLines\\(\\);\\s*else \\{[\\s\\S]{0,400}if \\(!prewarmStatusLine && !waitingLine\\) \\{/.test(src));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")

p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
lines=p.read_text(encoding="utf-8").split("\n")
for i,l in enumerate(lines):
    if "assistant start keeps initial status when blank" in l:
        lines[i]='ok("assistant start keeps initial status when blank", /else \\{[\\s\\S]{0,400}if \\(!prewarmStatusLine && !waitingLine\\) \\{\\s*prewarmStatusLine = resolveProgressText\\("processing"/.test(src));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")
print("fixed")
