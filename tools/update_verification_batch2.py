import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\VERIFICATION.md")
t=p.read_text(encoding="utf-8")
t=t.replace("`1ee0881b7d40652462a95981945ce46f349ce19cf06a792c76e52b41a82c23b9`","`6f988c9638bfed08495f0aa4d6d382b3b07a394b10b53c448a2924691a6783f8`",1)
t=t.replace("`ba5e6b2304d3857b5dcad0cedf04231792439ece132d5a490f8c260d85a3bc8d`","`1d9eb84636ee7db6c024874e292fe8d44a6f25d1615a67432e09e4ce93f6f3e8`",1)
t=t.replace("42 passed, 0 failed (2026.10.5 display/backfill/session)\n79 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 318 assertions","51 passed, 0 failed (2026.10.5 display/backfill/session)\n85 passed, 0 failed (2026.10.5 structural audit)\n8/8 suites passed, 0 failed — 333 assertions",1)
anchor="| **展示打磨 batch 1** | 初始化/处理状态跨 assistant start 保留，消除第二段空白；状态区紧凑为“主行 + 至多一行旁白”；等待行增加最后工具与耗时（5s 刷新）；旁白上限可配，默认 120 字 |"
add="\n| **展示打磨 batch 2** | 耗时刷新默认 15s 可配（`toolElapsedRefreshMs`），关闭 elapsed 不启动定时器；`cardStatusPosition` 支持 status 上下 A/B；reasoning 预览限行（默认 12 行）且 final 默认隐藏 thinking；可选 final 工具摘要（默认关闭） |"
assert anchor in t
t=t.replace(anchor,anchor+add,1)
t=t.replace("| 部署后目标哈希 | **`ba5e6b23…3bc8d`**（V1/V2/V3 + status 清空 + 预热/等待行 + 展示打磨 batch 1） |","| 部署后目标哈希 | **`1d9eb846…f3e8`**（V1/V2/V3 + status 清空 + 预热/等待行 + 展示打磨 batch 1/2） |",1)
t=t.replace("| 新备份（pristine） | `.monitor.backup-20261019T061654Z.mjs`（sha256 `72a0a198…3bfe`） |","| 新备份（pristine） | `.monitor.backup-20261019T062909Z.mjs`（sha256 `72a0a198…3bfe`） |",1)
t=t.replace("| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `1ee0881b…c23b9`） |","| 远程补丁副本 | `~/wayE-fixed/patches/2026.10.5/feishu-tool-aggregation.patch`（sha256 `6f988c96…83f8`） |",1)
t=t.replace("| Gateway | 重启后 `active`（PID 90972）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |","| Gateway | 重启后 `active`（PID 92755）；Feishu websocket 已启动；`/health` = **200**；启动日志无 TypeError/ReferenceError/unhandled |",1)
old="第 5 轮展示打磨（batch 1）：初始化/处理状态跨 assistant start 保留；状态区压缩为两行；等待行显示最后工具与耗时（5s 刷新）；旁白默认 120 字可配。实现版 `ba5e6b23…3bc8d` 已部署，本地 8/8 套件 318 断言通过，等待实机确认紧凑状态、耗时刷新与无第二段空白。"
new=old+"\n\n第 6 轮展示打磨（batch 2）：耗时刷新改为默认 15s 可配、关闭 elapsed 不启动定时器；新增 status 上下位置 A/B；reasoning 限行且 final 默认隐藏 thinking；可选 final 工具摘要。实现版 `1d9eb846…f3e8` 已部署，本地 8/8 套件 333 断言通过，等待实机对比 top/bottom 与最终卡片观感。"
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("VERIFICATION updated")
