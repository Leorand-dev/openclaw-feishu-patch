import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t=p.read_text(encoding="utf-8")
# item 5 refresh period
t=t.replace("(last tool + elapsed, refreshed every\n   5s) plus at most one secondary line with the latest narration.","(last tool + elapsed, refreshed every\n   15s by default via `toolElapsedRefreshMs`, 5–60s) plus at most one\n   secondary line with the latest narration.",1)
# item 12 config list
t=t.replace("    `narrationMaxChars`, `showLastToolLabel`, `showToolElapsed`,\n    `cardStatusElement`, `prewarmCard`; 15s start-failure","    `narrationMaxChars`, `showLastToolLabel`, `showToolElapsed`,\n    `toolElapsedRefreshMs`, `cardStatusElement`, `cardStatusPosition`,\n    `prewarmCard`; 15s start-failure",1)
# add item 14
anchor="13. **Cleanup** — 2026.10.2 leftovers"
add='''14. **Display polish batch 2** — `cardStatusPosition: top|bottom` A/B switch,
    reasoning preview capped at `reasoningMaxLines` (default 12) with an
    ellipsis, thinking hidden from the final card by default
    (`hideReasoningInFinal`), and an optional compact final tool summary
    (`finalToolSummary`, default off). Elapsed refresh is now 15s by default
    and configurable via `toolElapsedRefreshMs`; disabling `showToolElapsed`
    skips the refresh timer entirely.
'''
assert anchor in t
t=t.replace(anchor, add+anchor,1)
# waiting section refresh wording
t=t.replace("The first line is the waiting line (with last tool and elapsed time when\nenabled); the second line is the latest narration.","The first line is the waiting line (with last tool and elapsed time when\nenabled, refreshed every 15s by default); the second line is the latest narration.")
# config table: showToolElapsed row and extras
old="| `showToolElapsed` | `true` | append elapsed seconds (e.g. `12s`) to the waiting line; refreshed every 5s |"
new="| `showToolElapsed` | `true` | append elapsed seconds (e.g. `12s`) to the waiting line; disabling skips the refresh timer |\n| `toolElapsedRefreshMs` | `15000` | elapsed refresh interval (5–60s) |"
assert old in t
t=t.replace(old,new,1)
needle="| `progressTexts.prewarm` | `⏳ 已收到，正在处理…` | initial status on a prewarmed blank card |"
extra="""| `cardStatusPosition` | `bottom` | status element position: `bottom` (current) or `top` for always-visible progress (A/B) |
| `reasoningMaxLines` | `12` | max reasoning preview lines (2–100), followed by `…` |
| `hideReasoningInFinal` | `true` | hide thinking from the final card when an answer exists |
| `finalToolSummary` | `false` | append `> ✅ N 个工具 · 12s` to a mixed final answer |"""
assert needle in t
t=t.replace(needle,needle+"\n"+extra,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("README batch2 updated")
