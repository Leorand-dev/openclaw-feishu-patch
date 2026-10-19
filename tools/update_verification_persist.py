import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\VERIFICATION.md")
t=p.read_text(encoding="utf-8")
t=t.replace("`d023d22ccfa632c2fec890ed4467ad438725b6ca65bb0490634b4581d6a97df6`","`e7e1f775d904ede8b11dc37e66e379999b081470d21b77b16f6f72041812a4ec`",1)
t=t.replace("`3279d3fa1d597263ac0fff08dec8534103c3d192e5886b366e503e8f99b39247`","`588b061245a95a28ff8f1ec9f12c9459a5899cfa62810de9675e1cfd4caae8bc`",1)
t=t.replace("31 passed, 0 failed (2026.10.5 display/backfill/session)\n72 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 300 assertions","31 passed, 0 failed (2026.10.5 display/backfill/session)\n75 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 303 assertions",1)
# add waiting-line persistence feature row after prewarm row
t=t.replace("| **预热状态** | 卡片 ready 后立即显示 `⏳ 已收到，正在处理…`（`progressTexts.prewarm`），首个工具/旁白/正文出现时自动清除，避免空白预热卡 |","| **预热状态** | 卡片 ready 后立即显示 `⏳ 已收到，正在处理…`（`progressTexts.prewarm`），首个工具/旁白/正文出现时自动清除，避免空白预热卡 |\n| **等待行持久化** | `⏳ 已执行 N 个工具…` 在助手分段/中间文本开始时不再被清空（只清 item/compaction/narration 临时行），持续显示并随工具计数更新，仅在 final/关闭时移除 |",1)
# deployment rows
t=t.replace("| 部署后目标哈希 | **`3279d3fa…9247`**（V1/V2/V3 + status 清空 + 预热状态版） |","| 部署后目标哈希 | **`588b0612…e8bc`**（V1/V2/V3 + status 清空 + 预热状态 + 等待行持久化版） |",1)
t=t.replace("| 新备份（pristine） | `.monitor.backup-20261019T055036Z.mjs`（sha256 `72a0a198…3bfe`） |","| 新备份（pristine） | `.monitor.backup-20261019T055750Z.mjs`（sha256 `72a0a198…3bfe`） |",1)
t=t.replace("| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `d023d22c…7df6`） |","| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `e7e1f775…a4ec`） |",1)
t=t.replace("| Gateway | 重启后 `active`（PID 88110）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |","| Gateway | 重启后 `active`（PID 89605）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |",1)
# live section append
old="第 3 次实机测试同时暴露体验问题：预热卡从创建到首个工具/旁白状态有约 8 秒空白（13:47:16 建卡 → 13:47:24 首个状态）。修复：卡片 ready 后立即显示 `⏳ 已收到，正在处理…`，首个工具/旁白/正文出现时清除；修复版 `3279d3fa…9247` 已部署，本地 8/8 套件 300 断言通过。等待下一次实机确认预热状态立即出现、无空白卡。"
new="第 3 次实机测试同时暴露体验问题：预热卡从创建到首个工具/旁白状态有约 8 秒空白（13:47:16 建卡 → 13:47:24 首个状态）。修复：卡片 ready 后立即显示 `⏳ 已收到，正在处理…`，首个工具/旁白/正文出现时清除。\n\n第 4 次实机测试（13:53:11 消息，`3279d3fa` 版）确认预热状态即时出现：13:53:15.539 卡片 ready → 13:53:15.898 `Card status element update OK`（约 0.36s），空白期消除。\n\n第 4 次测试同时反馈等待行会因 assistant 分段开始被清空、频繁闪烁。修复：`onAssistantMessageStart` 在有工具活动时只清 item/compaction/narration 临时行，保留 `⏳ 已执行 N 个工具…` 直到 final/关闭；修复版 `588b0612…e8bc` 已部署，本地 8/8 套件 303 断言通过。等待实机确认等待行持续显示并随计数更新。"
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("VERIFICATION updated")
