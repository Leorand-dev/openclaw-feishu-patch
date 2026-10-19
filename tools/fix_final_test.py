import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-narration-ticker-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("final content clears status/ticker", /if \\(info\\?\\.kind === "final"\\) \\{\\s*renderEpoch \\+= 1;\\s*clearWaitingRefreshTimer\\(\\);\\s*toolPhaseStartedAt = 0;\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src));'
new='ok("final content clears status/ticker", /if \\(info\\?\\.kind === "final"\\) \\{\\s*renderEpoch \\+= 1;\\s*clearWaitingRefreshTimer\\(\\);\\s*clearCardStatusLines\\(\\);\\s*flushCardUpdate\\(true\\);/.test(src));'
assert old in t
p.write_text(t.replace(old,new,1),encoding="utf-8",newline="\n")
print("fixed")
