import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\audit-agg-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("close clears status element", /this\\.statusSentText !== ""\\) \\{\\s*this\\.statusSentText = "";\\s*await this\\.writeStatusContent\\(""\\)/.test(src));'
new='ok("close clears status element with zero-width marker", /this\\.statusSentText !== "\\\\u200B"\\) \\{\\s*this\\.statusSentText = "\\\\u200B";\\s*await this\\.writeStatusContent\\("\\\\u200B"\\)/.test(src));'
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("audit fixed")
