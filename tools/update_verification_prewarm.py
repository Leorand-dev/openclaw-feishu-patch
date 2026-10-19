import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\VERIFICATION.md")
t=p.read_text(encoding="utf-8")
# hashes
t=t.replace("`b50471234f09c6f419aea88cc73896e7e724d82b258201ac329ae6865728bbb0`","`d023d22ccfa632c2fec890ed4467ad438725b6ca65bb0490634b4581d6a97df6`",1)
t=t.replace("`4a5ec02676935e46d675a5e48c69d4e7d809e78516d72a661b31cfe0a8392ef7`","`3279d3fa1d597263ac0fff08dec8534103c3d192e5886b366e503e8f99b39247`",1)
t=t.replace("26 passed, 0 failed (2026.10.5 display/backfill/session)\n72 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 295 assertions","31 passed, 0 failed (2026.10.5 display/backfill/session)\n72 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 300 assertions",1)
# feature table add prewarm status row after early warm row
t=t.replace("| **提前开卡** | `onReplyStart` 在 preview streaming 开启时预热卡片（`prewarmCard` 可关）；卡片创建与工具执行重叠，消除 1–2s 空窗 |","| **提前开卡** | `onReplyStart` 在 preview streaming 开启时预热卡片（`prewarmCard` 可关）；卡片创建与工具执行重叠，消除 1–2s 空窗 |\n| **预热状态** | 卡片 ready 后立即显示 `⏳ 已收到，正在处理…`（`progressTexts.prewarm`），首个工具/旁白/正文出现时自动清除，避免空白预热卡 |",1)
# deployment
t=t.replace("| 部署后目标哈希 | **`4a5ec026…92ef7`**（V1/V2/V3 + status 清空修复版） |","| 部署后目标哈希 | **`3279d3fa…9247`**（V1/V2/V3 + status 清空 + 预热状态版） |",1)
t=t.replace("| 新备份（pristine） | `.monitor.backup-20261019T054420Z.mjs`（sha256 `72a0a198…3bfe`） |","| 新备份（pristine） | `.monitor.backup-20261019T055036Z.mjs`（sha256 `72a0a198…3bfe`） |",1)
t=t.replace("| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `b5047123…bbb0`） |","| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `d023d22c…7df6`） |",1)
t=t.replace("| Gateway | 重启后 `active`（PID 86324）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |","| Gateway | 重启后 `active`（PID 88110）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |",1)
# replace pending sentence in live section
t=t.replace("修复版已重新部署（`4a5ec026…92ef7`），本地 8/8 套件 295 断言通过；等待下一次实机消息确认 `Card status element update OK` 且无 `Status update failed`。","修复版已重新部署（`4a5ec026…92ef7`），实机第 3 次测试确认 `Card status element update OK`、无 `Status update failed`：双元素与清空均正常。\n\n第 3 次实机测试同时暴露体验问题：预热卡从创建到首个工具/旁白状态有约 8 秒空白（13:47:16 建卡 → 13:47:24 首个状态）。修复：卡片 ready 后立即显示 `⏳ 已收到，正在处理…`，首个工具/旁白/正文出现时清除；修复版 `3279d3fa…9247` 已部署，本地 8/8 套件 300 断言通过。等待下一次实机确认预热状态立即出现、无空白卡。",1)
# limitation update
t=t.replace("- **双元素 CardKit 行为**：已通过目标机 API 探针验证 create/update/clear（空 content 400 → 用零宽字符清空已修复）；仍需一次实机消息确认日志出现 `Card status element update OK` 且无失败。自动回退（状态合并回 content）保留，`cardStatusElement:false` 可强制 content-only。","- **双元素 CardKit 行为**：API 探针 + 实机日志均已确认 create/update/clear 正常（`Card status element update OK`，无失败）。自动回退（状态合并回 content）保留，`cardStatusElement:false` 可强制 content-only。\n- **预热状态**：已改为卡片 ready 即显示初始状态；等待下一次实机视觉确认。",1)
p.write_text(t,encoding="utf-8",newline="\n")
print("VERIFICATION updated")
