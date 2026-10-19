# -*- coding: utf-8 -*-
"""Update README for display polish batch 1."""
import pathlib
import re

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t = P.read_text(encoding="utf-8")

# 1) narration cap in item 3
t = t.replace("truncated to 240 chars, refreshed on every narration", "truncated to 120 chars by default (`narrationMaxChars`, 40–500), refreshed on every narration", 1)

# 2) replace item 5 block
start = t.index("5. **Waiting-only progress line")
end = t.index("6. **Status-line ownership")
new5 = """5. **Waiting-only progress line (compact status element)** — the card shows a
   compact status area in a dedicated markdown status element
   (`element_id: "status"`): a primary line
   `⏳ 已执行 N 个工具 · 最后：Read · 12s` (last tool + elapsed, refreshed every
   5s) plus at most one secondary line with the latest narration. Status lines
   use single `\\n` separators, a 160-char cap per line and a 400-char total
   budget, so progress/narration updates never rewrite the answer content
   element and never grow into a multi-paragraph block.
"""
t = t[:start] + new5 + t[end:]

# 3) item 11/12 config details
t = t.replace(
    "priority/budget.",
    "priority/budget. The initial status is kept through assistant message starts\n"
    "    until the first token/tool/narration, eliminating the second blank window.",
    1,
)
t = t.replace(
    "    `progressTexts` (waiting/completed/compacting strings),\n"
    "    `showLastToolLabel`, `cardStatusElement`, `prewarmCard`; 15s start-failure",
    "    `progressTexts` (waiting/completed/compacting/processing strings),\n"
    "    `narrationMaxChars`, `showLastToolLabel`, `showToolElapsed`,\n"
    "    `cardStatusElement`, `prewarmCard`; 15s start-failure",
    1,
)

# 4) version table article wording (24 hunks static later)
# (leave "23 hunks" for finalize to confirm)

# 5) waiting example block
t = t.replace(
    "The 2026.10.5 port changes what the card shows. Earlier ports folded per-tool\n"
    "lines into a summary such as `🛠️ 3 tools: 🛠️ Exec ×3`. That summary is gone; the\n"
    "card now carries a single bounded progress line:\n\n"
    "```\n"
    "⏳ 已执行 3 个工具，等待中…\n"
    "```",
    "The 2026.10.5 port changes what the card shows. Earlier ports folded per-tool\n"
    "lines into a summary such as `🛠️ 3 tools: 🛠️ Exec ×3`. That summary is gone; the\n"
    "card now carries a compact progress area:\n\n"
    "```\n"
    "⏳ 已执行 3 个工具 · 最后：Read · 12s\n"
    "💬 正在检查配置…\n"
    "```\n\n"
    "The first line is the waiting line (with last tool and elapsed time when\n"
    "enabled); the second line is the latest narration. Both are capped so they\n"
    "stay close to two visual lines instead of growing into paragraphs.",
    1,
)
t = t.replace(
    "Mid-turn narration (`💬 …`) is displayed inside the same card as a single\n"
    "rolling ticker line: only the latest narration is kept (whitespace collapsed,\n"
    "truncated to 240 chars), each new narration replaces the previous one, and the\n"
    "line is cleared as soon as the assistant answer starts streaming or a final\n"
    "payload arrives.",
    "Mid-turn narration (`💬 …`) is displayed inside the same card as a single\n"
    "rolling ticker line: only the latest narration is kept (whitespace collapsed,\n"
    "truncated to 120 chars by default), each new narration replaces the previous\n"
    "one, and the line is cleared as soon as the assistant answer starts streaming\n"
    "or a final payload arrives.",
    1,
)

# 6) config table rows
rows = {
    "`progressTexts.toolWaiting`": "| `progressTexts.toolWaiting` | `⏳ 已执行 {count} 个工具` | waiting line template |",
    "`showLastToolLabel`": "| `showLastToolLabel` | `true` | append `（最后：Read）`-style detail to the waiting line |",
}
lines = t.split("\n")
out = []
inserted = set()
for line in lines:
    s = line.strip()
    if s.startswith("| `progressTexts.toolWaiting`"):
        out.append(rows["`progressTexts.toolWaiting`"])
        continue
    if s.startswith("| `showLastToolLabel`"):
        out.append(rows["`showLastToolLabel`"])
        continue
    out.append(line)
t = "\n".join(out)
# add extra rows after showLastToolLabel row
needle = rows["`showLastToolLabel`"]
extra = """| `showToolElapsed` | `true` | append elapsed seconds (e.g. `12s`) to the waiting line; refreshed every 5s |
| `narrationMaxChars` | `120` | max code points for the narration ticker (40–500) |
| `progressTexts.processing` | `✍️ 正在生成回复…` | fallback status when assistant starts before first token/tool |
| `progressTexts.prewarm` | `⏳ 已收到，正在处理…` | initial status on a prewarmed blank card |"""
# remove existing prewarm row (we'll add a fresh one)
t = t.replace("| `progressTexts.prewarm` | `⏳ 已收到，正在处理…` | initial status on a prewarmed blank card |\n", "", 1)
t = t.replace(needle, needle + "\n" + extra, 1)

P.write_text(t, encoding="utf-8", newline="\n")
print("README batch1 updated")
