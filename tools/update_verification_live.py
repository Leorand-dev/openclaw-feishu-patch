import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\VERIFICATION.md")
t=p.read_text(encoding="utf-8")
# hashes
t=t.replace("`5cf777978cfe658a656148cc55ef765cf4cb20afa3eb5c0174f79e5107c162b3`","`b50471234f09c6f419aea88cc73896e7e724d82b258201ac329ae6865728bbb0`",1)
t=t.replace("`877c88518f6ae1d68c22884e403653843febb44013a4d0e2fdfede800dbbbeb7`","`4a5ec02676935e46d675a5e48c69d4e7d809e78516d72a661b31cfe0a8392ef7`",1)
# test counts
t=t.replace("26 passed, 0 failed (2026.10.5 idle/timer/content)\n32 passed, 0 failed (2026.10.5 narration ticker)\n24 passed, 0 failed (2026.10.5 display/backfill/session)\n72 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 293 assertions","26 passed, 0 failed (2026.10.5 idle/timer/content)\n32 passed, 0 failed (2026.10.5 narration ticker)\n26 passed, 0 failed (2026.10.5 display/backfill/session)\n72 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 295 assertions",1)
# deployment table
t=t.replace("| 部署后目标哈希 | **`877c8851…beb7`**（V1/V2/V3 优化版） |","| 部署后目标哈希 | **`4a5ec026…92ef7`**（V1/V2/V3 + status 清空修复版） |",1)
t=t.replace("| 新备份（pristine） | `.monitor.backup-20261019T053628Z.mjs`（sha256 `72a0a198…3bfe`） |","| 新备份（pristine） | `.monitor.backup-20261019T054420Z.mjs`（sha256 `72a0a198…3bfe`） |",1)
t=t.replace("| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `5cf77797…62b3`） |","| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `b5047123…bbb0`） |",1)
t=t.replace("| Gateway | 重启后 `active`（PID 84099）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled/status update failed |","| Gateway | 重启后 `active`（PID 86324）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |",1)
# insert live-test section before config section
live='''### 4.1 实机测试与 CardKit 诊断（2026-10-19）

首次实机测试（旧版 `877c8851`）日志：

- 预热生效：`streaming card ready in 1255ms` / `1216ms`（卡片创建与工具执行重叠）；
- 两次 `Status update failed: ... HTTP 400`，自动回退生效，无崩溃、无 dispatch 失败；
- 其余流式/关闭正常。

随后在目标机用 Feishu tenant token 做了**不发送消息**的 CardKit API 探针（`/home/vmser/cardkit-probe*.py`）：

| 探测 | 结果 |
| --- | --- |
| 创建 streaming 卡片（content+status 元素） | HTTP 200 / code 0 |
| 更新 content 元素 | HTTP 200 / code 0 |
| 更新 status 元素（非空） | HTTP 200 / code 0 |
| **更新 status 元素为空字符串** | **HTTP 400 / code 99992402 field validation failed** |
| 更新 status 元素为零宽字符 `\\u200B` | HTTP 200 / code 0 |
| 完整卡片（header/note/hr、`s_`/`st_` uuid、共享 sequence） | 全部成功 |

结论：双元素方案本身可用，失败是**关闭/清空时写入空 content**（CardKit 要求 content 长度 1–100000）。修复：

- `writeStatusContent` / `updateStatus` 将空内容映射为 `\\u200B`；
- `closeWithResult` 用 `\\u200B` 清空 status 元素；
- 增加一次性日志 `Card status element update OK`，便于实机确认。

修复版已重新部署（`4a5ec026…92ef7`），本地 8/8 套件 295 断言通过；等待下一次实机消息确认 `Card status element update OK` 且无 `Status update failed`。

'''
anchor="## 5. 配置项（可选）"
assert anchor in t
t=t.replace(anchor, live+anchor,1)
# limitation update
t=t.replace("- **双元素 CardKit 行为**：`status` 元素的 `/elements/status/content` 更新路径与多元素 streaming 卡片需真实 Feishu 客户端验证；代码已做失败自动回退（状态合并回 content），如异常可设 `cardStatusElement:false`。","- **双元素 CardKit 行为**：已通过目标机 API 探针验证 create/update/clear（空 content 400 → 用零宽字符清空已修复）；仍需一次实机消息确认日志出现 `Card status element update OK` 且无失败。自动回退（状态合并回 content）保留，`cardStatusElement:false` 可强制 content-only。",1)
p.write_text(t,encoding="utf-8",newline="\n")
print("VERIFICATION updated")
