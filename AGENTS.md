# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install, verify or roll back the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.11.1`**,
  **`@openclaw/feishu@2026.11.2`**, **`@openclaw/feishu@2026.11.3`** (11.3 ships
  the same monitor bundle as 11.2, so it uses the 11.2 patch bytes),
  **`@openclaw/feishu@2026.11.5`**, **`@openclaw/feishu@2026.11.6`**,
  **`@openclaw/feishu@2026.11.7`**, **`@openclaw/feishu@2026.11.9`** or
  **`@openclaw/feishu@2026.11.10`** (each ships its own bundle and therefore its
  own re-anchored patch; 11.8 is not vendored).
- The target file is the installed monitor bundle:

  ```
  ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs
  ```

- Required tools: `bash`, `patch`, `sha256sum` (or `shasum`).
- No credentials or network access to Feishu are needed for installation.
- The patch is content-only and uses CardKit 2.0 element APIs
  (`elements/{id}/content`, `elements/{id}` replace, `elements/{id}` delete); it
  does not use the legacy `status` element or
  `writeStatusContent`/`updateStatus` paths.
- Hosts still on 2026.10.10 must upgrade the plugin first; this release has no
  10.10 entry.

## Install

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh --check "$TARGET"
./install.sh "$TARGET"
```

Expected installer output (one of):

```
sha256: a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84   # 2026.11.1
sha256: 2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864   # 2026.11.2 / 2026.11.3
sha256: 9c88ab9bd55e443d38c6c7f6e5bcbe2c47b5847c459f37a768d00a01e1cb2032   # 2026.11.5
sha256: a8d6d9fab77b8ad8ab9545e14e38e9cc00a8ee5c4cfeb267639ea992c5c16781   # 2026.11.6
sha256: 343976b23d06fd98b08679cc8a9d3b04ecb4e4904312f0452b01cc33c007b0b1   # 2026.11.7
sha256: 829b2491e276ddd9c914c77be8e4f528a3a76b6cb5204e170c7c8f6d83e5f527   # 2026.11.9
sha256: 2aacc800450556ff6ffa2f204c9157f369b4649b1cefc599431d0919c28a41f6   # 2026.11.10
```

Restart the OpenClaw gateway using the host's normal supervisor (for example
`systemctl --user restart openclaw-gateway.service`). Unknown builds are
refused. A host that still carries an older patched bundle is upgraded in place:
the installer finds the pristine copy in `.monitor.backup-*.mjs` (matched by
hash), patches that copy and replaces the target atomically. `patches/HISTORY.json`
lists the recognised previous patched builds; `tools/finalize.py` keeps it and
the installer's `KNOWN_PATCHED` block in sync.

## Verify

```sh
sha256sum -c SHA256SUMS
cd tests && node run-all.mjs "$TARGET"
```

You can inspect state without changing files:

```sh
./install.sh --check "$TARGET"
./install.sh --dry-run "$TARGET"
```

Expected: `5/5 suites passed` with 220 assertions on the 2026.11.10 bundle; the
v4.x-gated cases detect their build, so older builds run 181. On a pristine
11.1/11.2/11.3/11.5/11.6/11.7/11.9/11.10 target, `--check` reports `status=pristine`; after installation
it reports `status=patched`.

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
python3 tools/check_docs.py
```

## Card layout contract (layout v4 on 2026.11.9; older builds keep v3)

```
① markdown #content      answer only (no status line, no thinking)
② markdown #progress     one stable status line: 预热行（图标×文案随机组合）/ 🔧 N 个工具 · 12s /
                          ✍️ 生成回复中… / green ✅ 完成 · N 个工具 · 2m03s
③ hr #divider            the only horizontal rule
④ collapsible_panel      「🧾 过程记录 · N」, body #detailspanel_body
                          reasoning: 💭 思考; live: 🔧 执行中 + groups
                          close: final groups; no tools & no reasoning: deleted
⑤ markdown #note         optional grey identity footer (no extra hr)
```

- Tool rows prefer the structured `onToolStart` name/args pair; single-tool
  groups carry the tool name in the title, multi-tool groups prefix rows with
  the tool icon. Commands and paths are rendered as code spans, keeping their
  head/tail and redacting credential substrings.
- Assistant commentary is written to `#progress` as `💬 …`, never into
  `#content`.
- Reasoning (`isReasoning`) and commentary (`isCommentary`) reply payloads are
  refused by the delivery hook even if a channel enables those core lanes: a
  reasoning payload only feeds the `💭` panel preview, a commentary payload only
  writes the grey `💬` line. Neither may reach `#content`.
- On 2026.11.9 the reasoning text lives in the collapsed panel body, not in
  `#content`: `buildContentText` is answer-only, and a turn with no answer keeps
  a `💭 思考记录` panel so the card is never blank. A non-extending snapshot is
  written through the element replace endpoint and skips the throttle.
- Status-line shape is fixed (`icon · count · elapsed`); the running tool is
  only shown inside the panel, so the line does not reflow on every tool event.
  The completion line is green, a failed final reply writes a red
  `⚠️ 回复失败` line.

- Prewarm: write one static line into `#progress` once the card is ready — a
  random icon (⏳ and seven variants) combined with a random text (思考中... plus
  five variants), both picked per turn — and clear it (zero-width space) on the
  first token, reasoning chunk or tool event. Still no animation, no timer.
- Live panel updates must stay `PUT .../elements/detailspanel_body/content`; the
  final render replaces the whole `detailspanel` element (title with the tool
  count) with the final markdown body.
- Empty tool turns must not leave a visible panel (a reasoning-only turn keeps
  the thinking panel).
- A recognized tool row that cannot join a streaming card (background process, subagent
  turn, raw render mode, card already closed) is buffered instead of being posted as a
  standalone message: the row is counted and replayed into the next card that opens in the
  same turn. `replyOptions.suppressToolProgressMessages` is set to `true` while preview
  streaming is on, so core never posts its own per-tool progress message (with
  `renderMode=card` each of those became its own bubble); the final reply still uses the
  normal path.
- The completion line belongs to `#progress`; content must stay answer-only. If
  the progress write fails, fold the line back into the content instead.

## Guardrails

- **Do not** apply this patch to a different plugin build. The installer will
  refuse an unknown pristine hash; report the actual target hash and stop.
- **Do not** set new Feishu config keys. Behavior is compiled into the patch.
- **Do not** paste credentials, tokens, hostnames, or chat contents into this
  repository.
- **Do not** restart the gateway mid-turn. Restart recovery may produce temporary
  standalone progress posts because no streaming card exists yet; the next turn
  after the gateway is healthy returns to the single-card flow.
- If installation fails the target is left untouched (the patch is applied to a
  temp copy and only `mv`-ed into place after the post-patch hash matches); a
  backup of the previous file stays next to the target. Report the error; do not
  retry with fuzzy patching.
- A new deployment is only verified after one real Feishu tool turn: single
  card, `⏳ 思考中...` prewarm line, grey progress line, expandable
  `🧾 过程记录` with summary + groups, final `✅ 完成`, no residual loading.
- Plugin upgrades reinstall `dist/` and delete `.monitor.backup-*.mjs`. Re-apply
  the patch after every upgrade. Backups rotate automatically (newest 3, and the
  newest pristine copy is never pruned), so keep an out-of-tree copy of the
  pristine bundle if you need a permanent rollback target.
- A stale `.monitor-install.lock` is reclaimed automatically when its pid is gone
  or it is older than 15 minutes; do not delete a lock that belongs to a running
  install.
- A card's streaming window ends 10 minutes after the card is created: the first
  late write returns `200850` (`card streaming timeout`) and later ones `300309`
  (`streaming mode is closed`). On 2026.11.7 the card-write layer (`putElement()`)
  reopens the card (`streaming_mode: false` then `true`) and retries the write
  once, which is why a long reply can finish in the same card; the patch routes
  `content`, `#progress`, `#detailspanel_body` and `note` through it. Only when
  that reopen fails does the session fall back to terminal expiry: writes stop,
  the frozen card is deleted at close and the answer is delivered as a normal
  message. Do not add further retries for these two codes — one reopen per closed
  window is the supported budget.

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
# Newest backup may be the previous patch; use the pristine copy --check reports.
PRISTINE_BACKUP=$(./install.sh --check "$TARGET" | sed -n 's/.*pristine_backup=\([^ ]*\).*/\1/p')
cp -p "$PRISTINE_BACKUP" "$TARGET"
systemctl --user restart openclaw-gateway.service
```

## Current build reference

| item | 2026.11.1 | 2026.11.2 / 2026.11.3 | 2026.11.5 | 2026.11.6 | 2026.11.7 | 2026.11.9 | 2026.11.10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| plugin build | `2026.11.1` | `2026.11.2`, `2026.11.3` | `2026.11.5` | `2026.11.6` | `2026.11.7` | `2026.11.9` | `2026.11.10` |
| pristine SHA-256 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` | `8d5cfbd6d9baf330da775a20850de522e62802d211d43f8af91f5063266d9e07` | `36a2c58e4e0b8887e372cf881321c4c0c876a35e9039f5b6b72326122d29517c` | `1bee687d4849b1628d536ee8490f66b6ae761d2bfc980fd24ffaa53a4259d74e` | `359a1e8eb4e072a0f6cccd3f0b7cb63a4cec4194d678e87c286737a4bab5b880` | `b29209583f72f4469788834539de9a28c7ecef4f2366c82da95b1a7760a75cdc` |
| patched SHA-256 | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` | `9c88ab9bd55e443d38c6c7f6e5bcbe2c47b5847c459f37a768d00a01e1cb2032` | `a8d6d9fab77b8ad8ab9545e14e38e9cc00a8ee5c4cfeb267639ea992c5c16781` | `343976b23d06fd98b08679cc8a9d3b04ecb4e4904312f0452b01cc33c007b0b1` | `829b2491e276ddd9c914c77be8e4f528a3a76b6cb5204e170c7c8f6d83e5f527` | `2aacc800450556ff6ffa2f204c9157f369b4649b1cefc599431d0919c28a41f6` |
| patch SHA-256 | `485950c853b37ede8fa02da5a53a8be064f119a212ff4e6294a11b9d1006c1dd` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` | `8164c44d84f965d318285adaec2f95b68284b24dae33c52e3d2a60b74a24570c` | `83f827ed1f24bbb0785c80115a3423299f2a9768de69d070e87235575d2477ce` | `14095f5b37f955632e069385c5e657fb702d4a1fa826c81b08707bf58def5d9e` | `55e3f7ebafcd2f0d680bd278e205c27f54b2852d615dc8b3c1fc1d18040eb590` | `969f66f9c7cf9e9371ab73b9e3c5c257b5ba4ecd4fa7a9db0a720a3d2e7a7802` |
| patch hunks | 32 | 32 | 31 | 31 | 32 | 32 | 33 |
| test assertions | 220 | 220 | 220 | 220 | 220 | 220 | 220 |

See `README.md` for behavior and limitations.
