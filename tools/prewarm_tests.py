import pathlib
# narration sandbox: stub clearPrewarmStatus
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
t=p.read_text(encoding="utf-8")
old="const startStreaming = () => {};\nconst clearIdleCloseTimer = () => { timerClears += 1; };"
new="const startStreaming = () => {};\nconst clearPrewarmStatus = () => {};\nconst clearIdleCloseTimer = () => { timerClears += 1; };"
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")

# display test: add prewarm structural assertions
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
anchor='// ---------- 4) status fallback text renderer ordering ----------'
add='''// ---------- 3b) prewarm keeps the card non-blank ----------
ok("prewarm status requested at reply start", /prewarmRequested = true;\\s*startStreaming\\(\\);/.test(src));
ok("prewarm status rendered when card becomes ready", /prewarmStatusLine = resolveProgressText\\("prewarm", "\\\\\\\\u23F3 \\\\\\\\u5df2\\\\\\\\u6536\\\\\\\\u5230\\\\\\\\uff0c\\\\\\\\u6b63\\\\\\\\u5728\\\\\\\\u5904\\\\\\\\u7406\\\\\\\\u2026"\\);/.test(src));
ok("prewarm status clears on first content/waiting/narration", /const clearPrewarmStatus = \\(\\) => \\{/.test(src) && (src.match(/clearPrewarmStatus\\(\\);/g) || []).length >= 5);
ok("waiting line replaces prewarm status", /prewarmStatusLine = "";\\s*waitingLine = nextWaitingLine;/.test(src));
ok("prewarm text configurable", /progressTexts\\?\\.\\[key\\]/.test(src) || /progressTexts/.test(src));

'''
assert anchor in t
t=t.replace(anchor,add+anchor,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("test updates applied")
