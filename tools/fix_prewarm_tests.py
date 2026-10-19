import pathlib, re
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
lines=t.split("\n")
for i,l in enumerate(lines):
    if "prewarm status rendered when card becomes ready" in l:
        lines[i]='ok("prewarm status rendered when card becomes ready", src.includes(\'resolveProgressText("prewarm"\') && src.includes(\'prewarmStatusLine = resolveProgressText\'));'
p.write_text("\n".join(lines),encoding="utf-8",newline="\n")

p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\audit-agg-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("early card prewarm wired", /previewStreamingEnabled && renderMode !== "raw" && account\\.config\\?\\.prewarmCard !== false\\) startStreaming\\(\\);/.test(src));'
new='ok("early card prewarm wired", /previewStreamingEnabled && renderMode !== "raw" && account\\.config\\?\\.prewarmCard !== false\\) \\{\\s*prewarmRequested = true;\\s*startStreaming\\(\\);/.test(src) && /prewarmStatusLine = resolveProgressText\\("prewarm"/.test(src));'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("fixed")
