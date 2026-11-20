# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It folds tool progress into one streaming card: a grey progress line (starting
with `⏳ 思考中...` as soon as the card exists), a collapsed `🧾 过程记录` panel
that lists which tools ran and what they touched, and a single final `✅ 完成`
line. Tool names and targets come from the structured `onToolStart` callback
(the reviewed text shapes remain a fallback), and model commentary is shown on
the progress line instead of leaking into the answer.

- **Supported plugin builds:** `@openclaw/feishu` **2026.11.1**, **2026.11.2**,
  **2026.11.3**, **2026.11.5** and **2026.11.6** (11.3 installs the same
  monitor bundle as 11.2; 11.5 and 11.6 each ship a new bundle, so their
  patches are re-anchored)
- **Patch type:** unified diff against the installed
  `dist/.setup/monitor.account-*.mjs`
- **Install:** exact SHA-256 check; backup; atomic replace; idempotent
- **No credentials required by this repository**

> This repository ships the patch, installer and tests. It does not redistribute
> the upstream plugin bundle.

## Supported builds

| item | 2026.11.1 | 2026.11.2 / 2026.11.3 | 2026.11.5 | 2026.11.6 |
| --- | --- | --- | --- | --- |
| plugin | `@openclaw/feishu@2026.11.1` | `@openclaw/feishu@2026.11.2`, `@openclaw/feishu@2026.11.3` | `@openclaw/feishu@2026.11.5` | `@openclaw/feishu@2026.11.6` |
| pristine bundle | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` | `8d5cfbd6d9baf330da775a20850de522e62802d211d43f8af91f5063266d9e07` | `36a2c58e4e0b8887e372cf881321c4c0c876a35e9039f5b6b72326122d29517c` |
| patched bundle | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` | `9c88ab9bd55e443d38c6c7f6e5bcbe2c47b5847c459f37a768d00a01e1cb2032` | `a8d6d9fab77b8ad8ab9545e14e38e9cc00a8ee5c4cfeb267639ea992c5c16781` |
| patch | `485950c853b37ede8fa02da5a53a8be064f119a212ff4e6294a11b9d1006c1dd` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` | `8164c44d84f965d318285adaec2f95b68284b24dae33c52e3d2a60b74a24570c` | `83f827ed1f24bbb0785c80115a3423299f2a9768de69d070e87235575d2477ce` |
| patch hunks | 32 | 32 | 31 | 31 |
| test assertions | 164 | 164 | 164 | 164 |

The installer selects the patch by the target's SHA-256. It accepts a pristine
2026.11.1/2026.11.2/2026.11.3/2026.11.5/2026.11.6 bundle, the **current** patched bundle, and any earlier
patched bundle listed in `patches/HISTORY.json` (the `KNOWN_PATCHED` block).
Because the patch is generated against pristine bytes, upgrading an older
patched host means: take the newest `.monitor.backup-*.mjs` next to the target
whose hash equals the pristine build, patch that copy, then replace the target
atomically. The installer does this by itself and refuses (with instructions) if
no pristine backup is left — in that case reinstall the plugin, which restores
`dist/` as pristine, and re-run. Hosts still on 2026.10.10 must upgrade the
plugin first.

2026.11.2 is a small upstream delta over 2026.11.1: `//#region` /
`//#endregion` section markers around every module, chunk-name renames, and a
card-action hardening (an unresolvable chat type now refuses the action instead
of defaulting to `p2p`). None of it touches the streaming-card, progress or tool
paths, so the 2026.11.2 patch carries the same change blocks as 2026.11.1 —
re-anchored, not re-designed.

2026.11.3 does not change this bundle at all: `@openclaw/feishu@2026.11.3`
installs a `monitor.account-*.mjs` byte-identical to the 2026.11.2 pristine
bundle (SHA-256 `44f6d50f…`). `patches/2026.11.3/` therefore mirrors the
reviewed 2026.11.2 patch verbatim (patch SHA-256 `de564abe…`); the installer
reports `version=2026.11.3` and produces the same patched bundle
(`2472f7a1…`). Hosts on `OpenClaw 2026.11.3` need no re-derivation.

2026.11.5 is a real upstream delta: the monitor bundle shrinks from 260608 to
242935 bytes because several helpers moved into the plugin SDK
(`readProviderJsonResponse`, `sha256Hex`, `enqueueKeyedTask`, `sendJson`,
`createStaleWhileRevalidateCache`), the bespoke
`FeishuStreamingFinalizationError` is replaced by the channel partial-delivery
error, and the reply dispatcher gains a core-driven `model-wait` progress lane.
The 11.5 patch is therefore re-derived, not mirrored: 31 hunks instead of 32
(one 11.2 hunk disappeared with the upstream refactor) and a new patched bundle
SHA-256. `model-wait` text is routed to `#progress`, so it behaves like the
other status lines and never enters `#content`.

2026.11.6 is a small upstream delta on top of 2026.11.5 (bundle 242935 -> 243155
bytes): the internal chunk names change (`channel-DDrdYVwq`, `monitor-CDBNol9H`),
`normalizeFeishuCommandProbeBody()` keeps line breaks for multiline slash
commands, and card actions whose chat type cannot be resolved are now refused
(with a user notice) instead of defaulting to `p2p`. None of it overlaps the
streaming-card, progress, panel or tool paths, so the 11.6 patch is the reviewed
11.5 change set re-anchored onto the new bundle: same 31 hunks, new offsets, and
a new patched bundle SHA-256.

## Card layout (layout v3 + prewarm)

```
[header]                          optional title + template
  ① markdown #content             reasoning phase: 💭 thinking blockquote
                                  answer phase: answer only (blockquote cleared)
  ② markdown #progress            grey status / commentary / completion line
  ③ hr #divider                   separates answer from the process panel
  ④ collapsible_panel             collapsed 「🧾 过程记录」
       markdown #detailspanel_body   summary + compact category groups
  ⑤ hr + markdown #note           optional grey identity footer
```

Thinking preview: while the model is still reasoning, `#content` shows it as a
`> 💭 **Thinking**` blockquote. The first answer characters replace that
blockquote — a shrink is written through the element replace endpoint and
bypasses the 250 ms throttle — so the live card turns answer-only at the same
moment the answer starts, and the closed card carries the same text. If the turn
produced no answer (aborted, held close) the blockquote is kept so the card is
never blank.

Prewarm: every supported build already creates the card in `onReplyStart`, but
leave it empty until the first token. The patch writes `⏳ 思考中...` into
`#progress` as soon as the card is ready, and clears it (zero-width space) when
the first token, reasoning chunk or tool event arrives. The text is static — no
animation, no extra API calls beyond that one write.

Tool details: the panel prefers the structured `onToolStart` event (tool name +
args) and derives a one-line target per tool — `exec` → command, `read`/`edit` →
path, `web_search` → query, and so on. A single-tool group carries the tool name
in its title (`**命令 · 终端**`) so rows only show the target; multi-tool groups
prefix each row with the tool icon. Repeated identical calls merge as `×N`;
calls beyond the newest 20 fold into `… 另有 N 个较早调用`. Command text keeps
its head, paths keep their tail, and credential-looking substrings are redacted.

Commentary: assistant commentary ("我先看一下这个文件…") is written to
`#progress` as a grey `💬 …` line instead of the answer, so `#content` stays
answer-only.

At close, when the turn used tools the panel body is replaced once with the
final markdown body (summary line + groups). When the turn used no tools, the
panel and the divider are deleted so a plain Q&A card has no empty panel.

## What it does

- Records every tool start from the structured `onToolStart` callback (name +
  args) and falls back to recognized tool payloads (`Exec`, `Read: ...`,
  `Web Fetch: ...`, emoji-prefixed tool summaries) when the callback is absent.
- Writes the live status into the dedicated `#progress` element as grey text:
  - `⏳ 思考中...` between reply start and the first output
  - `⏳ N 个工具 · 12s · 终端 git status` while tools run (current tool + target)
  - `✅ N 个工具 · 生成回复中…` when the answer starts
  - `⏳ N 个工具 · 处理中…` if the bounded idle hold expires
  - `✅ 完成 · 已执行 N 个工具 · 2m03s` on final close
- Writes the collapsed `🧾 过程记录` panel as a summary line plus category
  groups (`命令` / `文件` / `网络` / `会话` / `其他`), e.g.
  `**12 个工具 · 45s**`, `**命令 · 终端**`, `- git status ×2`.
- Uses the CardKit 2.0 element APIs only: `PUT .../elements/{id}/content`
  (streaming text), `PUT .../elements/{id}` (replace the panel body with the
  final markdown), `DELETE .../elements/{id}` (drop the empty panel). The legacy
  `status` element, `writeStatusContent`, `updateStatus` and
  `deleteStatusElement` paths are intentionally not present.
- Keeps the native `closeWithResult()` / `discard()` finalization paths.
- Counts the Feishu API calls it makes per turn (card, message, reaction) and logs
  one line at cleanup: `turn api calls: total=N card=X message=Y reaction=Z`.
- Defers a core idle close for up to 24 seconds (three 8-second windows) while a
  tool turn has no answer text, so normal tool batches and the final reply stay
  on one card. If the bound is reached, it closes with a neutral `处理中` line
  instead of a false `完成` and keeps tool counters for the next card.
- Retries transient content, element and close-settings writes (HTTP 408/429/5xx
  and Feishu backoff codes) with bounded backoff; permanently rejected writes
  fail without retry.
- Detects the end of a card's streaming window and stops writing. Feishu ends
  streaming **10 minutes** after a card starts: the first late write returns
  code `200850` (`card streaming timeout`) and every later one `300309`
  (`streaming mode is closed`). Both are treated as terminal — the session is
  marked expired, all further progress/details/content writes become no-ops
  (no retries, no API calls), and at close the frozen card is deleted and the
  turn reports "no visible reply" so the answer is delivered as a normal
  message instead of being lost.
- Fails open: if the progress element write fails the completion line is folded
  back into the content; if the final panel replace fails the live grouped
  markdown is kept; if the empty-panel delete fails the panel simply stays.
- Does not inject new Feishu config keys.

## Quick install

Requirements: Linux/macOS (or WSL), `bash`, `patch`, `sha256sum` or `shasum`.

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh --check "$TARGET"
./install.sh "$TARGET"
```

Restart the OpenClaw gateway after installation. The installer prints the
backup path and the patched SHA-256, verifies the post-patch hash, and restores
the backup on failure.

`--check` reports `status=pristine`, `status=patched` or `status=unknown`.
`--dry-run` validates the exact target without changing it.

## Verify

```sh
sha256sum -c SHA256SUMS
cd tests
node run-all.mjs ../patches/2026.11.6/patched.mjs
node run-all.mjs ../patches/2026.11.5/patched.mjs
node run-all.mjs ../patches/2026.11.2/patched.mjs   # 11.3 has the same bytes
node run-all.mjs ../patches/2026.11.1/patched.mjs
```

Expected: `5/5 suites passed, 0 failed` with 164 assertions, for any supported build.

Mechanical checks:

```sh
python3 tools/check_docs.py
python3 tools/verify_patch.py --all=patches
```

## Patch architecture

- `patches/2026.11.1/` and `patches/2026.11.2/` — reviewed pristine/patched
  bundle pairs and their canonical unified diffs.
- `patches/2026.11.3/` — mirror of the 2026.11.2 patch (its upstream bundle is
  byte-identical), so only the patch file is stored there.
- `patches/2026.11.5/` — reviewed pristine/patched bundle pair and canonical
  patch for the 2026.11.5 monitor bundle (upstream refactor, 31 hunks).
- `patches/2026.11.6/` — reviewed pristine/patched bundle pair and canonical
  patch for the 2026.11.6 monitor bundle (small upstream delta, 31 hunks).
- `patches/MANIFEST.json` / `patches/UPGRADES.json` — build metadata.
- `patches/HISTORY.json` — previous patched bundle hashes; feeds the installer's
  `KNOWN_PATCHED` block so an older patched host upgrades in place.
- `patches/SHA256SUMS` — bundle and patch checksums for the internal tree.
- `tools/finalize.py` — regenerates each patch, the manifest, the installer
  block and `patches/SHA256SUMS` from the reviewed bundle pairs.
- `tools/verify_patch.py` — forward/reverse byte-exact verification.
- `tools/adapt_patch.py` — anchor adapter for re-deriving the patch against a
  different minor build (review the result manually).

The public release may omit `original.mjs` and `patched.mjs`; the patch and
installer remain usable without them. The internal tree keeps both bundles so
the patch can be regenerated.

### Upgrading a host that already carries an older patch

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh --check "$TARGET"     # status=patched version=2026.11.3 outdated=true ...
./install.sh "$TARGET"             # restores pristine from .monitor.backup-*.mjs, then patches
systemctl --user restart openclaw-gateway.service
```

`--check` reports `status=patched version=<ver> outdated=true pristine_backup=<path|missing>`.
`--dry-run` prints `would upgrade (rebase) ...` without touching the target.
`patches/HISTORY.json` is append-only release history (last 20 patched builds);
`tools/finalize.py` keeps it and the installer's `KNOWN_PATCHED` block in sync,
and CI fails when they drift.

### Installer safety rails

- A lock directory `<target dir>/.monitor-install.lock` holds the owner pid and
  timestamp; a lock left by a killed process is removed automatically once its
  pid is gone or it is older than 15 minutes (`LOCK_STALE_SECONDS`).
- Backup copies are rotated: the newest 3 are kept, and the newest pristine copy
  is never pruned (it is the rollback and in-place-upgrade source).
- A failed `patch` leaves no `.rej`/`.orig` files behind.
- `--check` never modifies the target; the patch file's own SHA-256 is verified
  before anything is written.

Secret redaction covers `token=…` / `authorization: Bearer …`
forms, provider token shapes (`sk-…`, `ghp_…`, `xox*-…`) and `--password value`
style flags; the same redaction runs on the assistant commentary that goes into
`#progress`.


### Reasoning / commentary payload lanes (batch 13)

`openclaw` can hand a channel reply payloads flagged `isReasoning: true` or
`isCommentary: true`. The Feishu plugin does not enable those lanes
(`replyOptions.reasoningPayloadsEnabled` / `commentaryPayloadsEnabled` are unset),
so they are normally never delivered — but the delivery hook now refuses them
anyway: a reasoning payload only feeds the `💭` preview, a commentary payload only
writes the grey `💬` progress line, and neither can become answer text in
`#content`.

### Card write breaker (batch 12)

If Feishu rejects an element replace twice, the session stops replacing and
falls back to streaming content updates instead of burning one failed request
per snapshot. If content writes fail three times in a row, the content element
is frozen, the remaining progress/details writes stop, and the close reports
`finalTextAccepted:false` so the reply is delivered as a normal message instead
of showing a half-written card. Both doors log once
(`Card content replace disabled…` / `Card content writes disabled…`).

## Notes and known limits

- The patch is pinned to exact monitor bundles (2026.11.1, 2026.11.2,
  2026.11.3, 2026.11.5 and 2026.11.6 — 11.2 and 11.3 share one bundle). Do not apply it to a different
  version; the installer refuses unknown hashes.
- 2026.11.1 removed `mergeStreamingText()` and `lastSnapshotTextLength`, and
  `onAssistantMessageStart` now resets `snapshotBaseText` / `lastPartial`. The
  patch keeps that upstream behaviour and layers the tool state machine on top;
  the four hunks that touch those areas are re-anchored for 11.1.
- 2026.11.2 adds `//#region` / `//#endregion` section markers and renames the
  internal chunk imports. The 11.2 patch is the same reviewed change set
  re-anchored onto that build (32 hunks, same count as 11.1); its change blocks
  are byte-identical to the 11.1 patch's. The core side is unchanged:
  `openclaw@2026.11.2` still calls `replyOptions.onToolStart` with
  `{ name, args, phase }`.
- 2026.11.3 was checked against the same code: the plugin package bumped its
  version but ships the 2026.11.2 monitor bundle unchanged, so the patch does
  not need to be re-anchored for `OpenClaw 2026.11.3` (build `847611d`).
- 2026.11.5 is a genuine rebuild: helpers moved into the plugin SDK, the card
  finalization error became the channel partial-delivery error, and the
  dispatcher gained the core `model-wait` progress lane. The patch was
  re-derived from the 11.2 patched bundle with a three-way merge plus nine
  reviewed conflicts; it keeps the layout v3 contract, maps `model-wait` text
  onto `#progress`, and is 31 hunks.
- 2026.11.6 only renames internal chunks, keeps line breaks in multiline slash
  commands and refuses unresolvable card actions. The 11.5 patch applies with
  re-anchored offsets (31 hunks, patched SHA-256 `a8d6d9fa…`); the captured
  review from 11.5 still describes the behaviour.
- `✅ 完成` is written to the progress element. If the turn falls back to a
  non-streaming static send, that static card is unchanged.
- Tool aggregation only applies to structured tool starts and the reviewed
  tool-summary shapes; errors, media payloads, narration and unknown shapes
  follow the normal delivery path.
- The panel body stays a single markdown element for both the live and the final
  render, so it works on narrow screens and never depends on `column_set`.
- The prewarm line is static (`⏳ 思考中...`). It is cleared on the first token,
  reasoning chunk or tool event; a turn that produces no visible reply closes the
  card with the normal completion line.
- A canary deployment must be validated with one real Feishu tool turn after
  installing on a new host (single card, prewarm line, progress line,
  expandable panel, final `✅ 完成`, no residual loading).

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```
