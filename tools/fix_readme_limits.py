import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t=p.read_text(encoding="utf-8")
t=t.replace("| card body | `🛠️ N tools: 🛠️ Exec ×3` summary | `⏳ 已执行 N 个工具，等待中…` |","| card body | `🛠️ N tools: 🛠️ Exec ×3` summary | compact status: `⏳ 已执行 N 个工具 · 最后：Read · 12s` + latest narration |",1)
t=t.replace("single rolling ticker line inside the card (latest only, ≤240 chars), cleared on final","single rolling ticker line inside the card (latest only, ≤120 chars by default), cleared on final",1)
p.write_text(t,encoding="utf-8",newline="\n")
print("updated")
