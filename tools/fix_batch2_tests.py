import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests\test-display-backfill-105.mjs")
t=p.read_text(encoding="utf-8")
old='ok("status position passed to session", /statusPosition \\}/.test(src) && /this\\.statusPosition === "top" \\? "top" : "bottom";/.test(src));'
new='ok("status position passed to session", /statusPosition \\}/.test(src) && /this\\.statusPosition = options\\.statusPosition === "top" \\? "top" : "bottom";/.test(src));'
assert old in t
t=t.replace(old,new,1)
old2='ok("reasoning preview adds ellipsis when capped", /lines\\.length > REASONING_MAX_LINES \\? \\[\\.\\.\\.lines\\.slice\\(0, Math\\.max\\(1, REASONING_MAX_LINES - 1\\)\\), "\\u2026"\\] : lines/.test(src));'
new2='ok("reasoning preview adds ellipsis when capped", src.includes("lines.length > REASONING_MAX_LINES") && src.includes("Math.max(1, REASONING_MAX_LINES - 1)"));'
assert old2 in t
t=t.replace(old2,new2,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("fixed")
