import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t=p.read_text(encoding="utf-8")
old='''11. **Display pipeline V1/V2** — early card prewarm (`prewarmCard`, card is
    ready before tools start), latest-state backfill (queued updates render the
    latest state *after* the card starts, coalesced while starting), a dedicated
    CardKit status element with automatic content fallback if the element update
    is rejected, and structured status priority/budget.'''
new='''11. **Display pipeline V1/V2** — early card prewarm (`prewarmCard`, card is
    ready before tools start) with an immediate `⏳ 已收到，正在处理…` status so the
    warm card is never blank while the model/agent thinks; latest-state backfill
    (queued updates render the latest state *after* the card starts, coalesced
    while starting), a dedicated CardKit status element with automatic content
    fallback if the element update is rejected, and structured status
    priority/budget.'''
assert old in t
t=t.replace(old,new,1)
old2='''| `progressTexts.compacting` | `📦 **Compacting context...**` | compaction line |'''
new2='''| `progressTexts.compacting` | `📦 **Compacting context...**` | compaction line |
| `progressTexts.prewarm` | `⏳ 已收到，正在处理…` | initial status on a prewarmed blank card |'''
assert old2 in t
t=t.replace(old2,new2,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("README updated")
