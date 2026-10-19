import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\VERIFICATION.md")
t=p.read_text(encoding="utf-8")
t=t.replace("`e7e1f775d904ede8b11dc37e66e379999b081470d21b77b16f6f72041812a4ec`","`1ee0881b7d40652462a95981945ce46f349ce19cf06a792c76e52b41a82c23b9`",1)
t=t.replace("`588b061245a95a28ff8f1ec9f12c9459a5899cfa62810de9675e1cfd4caae8bc`","`ba5e6b2304d3857b5dcad0cedf04231792439ece132d5a490f8c260d85a3bc8d`",1)
t=t.replace("31 passed, 0 failed (2026.10.5 display/backfill/session)\n75 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 303 assertions","42 passed, 0 failed (2026.10.5 display/backfill/session)\n79 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 318 assertions",1)
# feature row
anchor="| **等待行持久化** | `⏳ 已执行 N 个工具…` 在助手分段/中间文本开始时不再被清空（只清 item/compaction/narration 临时行），持续显示并随工具计数更新，仅在 final/关闭时移除 |"
add="\n| **展示打磨 batch 1** | 初始化/处理状态跨 assistant start 保留，消除第二段空白；状态区紧凑为“主行 + 至多一行旁白”；等待行增加最后工具与耗时（5s 刷新）；旁白上限可配，默认 120 字 |"
assert anchor in t
t=t.replace(anchor,anchor+add,1)
# deployment rows
t=t.replace("| 部署后目标哈希 | **`588b0612…e8bc`**（V1/V2/V3 + status 清空 + 预热状态 + 等待行持久化版） |","| 部署后目标哈希 | **`ba5e6b23…3bc8d`**（V1/V2/V3 + status 清空 + 预热/等待行 + 展示打磨 batch 1） |",1)
t=t.replace("| 新备份（pristine） | `.monitor.backup-20261019T055750Z.mjs`（sha256 `72a0a198…3bfe`） |","| 新备份（pristine） | `.monitor.backup-20261019T061654Z.mjs`（sha256 `72a0a198…3bfe`） |",1)
t=t.replace("| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `e7e1f775…a4ec`） |","| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `1ee0881b…c23b9`） |",1)
t=t.replace("| Gateway | 重启后 `active`（PID 89605）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |","| Gateway | 重启后 `active`（PID 90972）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |",1)
# live section append
old="第 4 次测试同时反馈等待行会因 assistant 分段开始被清空、频繁闪烁。修复：`onAssistantMessageStart` 在有工具活动时只清 item/compaction/narration 临时行，保留 `⏳ 已执行 N 个工具…` 直到 final/关闭；修复版 `588b0612…e8bc` 已部署，本地 8/8 套件 303 断言通过。等待实机确认等待行持续显示并随计数更新。"
new=old+"\n\n第 5 轮展示打磨（batch 1）：初始化/处理状态跨 assistant start 保留；状态区压缩为两行；等待行显示最后工具与耗时（5s 刷新）；旁白默认 120 字可配。实现版 `ba5e6b23…3bc8d` 已部署，本地 8/8 套件 318 断言通过，等待实机确认紧凑状态、耗时刷新与无第二段空白。"
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("VERIFICATION updated")
