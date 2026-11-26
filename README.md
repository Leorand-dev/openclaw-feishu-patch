# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It folds tool progress into one streaming card: a grey progress line (starting
with a `⏳` prewarm line (six reviewed variants, one random pick per turn) as soon as the card exists), a collapsed `🧾 过程记录` panel
that lists which tools ran and what they touched, and a single final `✅ 完成`
line. Tool names and targets come from the structured `onToolStart` callback
(the reviewed text shapes remain a fallback), and model commentary is shown on
the progress line instead of leaking into the answer.

- **Supported plugin builds:** `@openclaw/feishu` **2026.11.1**, **2026.11.2**,
  **2026.11.3**, **2026.11.5**, **2026.11.6**, **2026.11.7**, **2026.11.9** and
  **2026.11.10** (11.3 installs the same monitor bundle as 11.2; each other
  build ships its own bundle, so its patch is re-anchored). 11.7 reopens a
  closed streaming window, 11.9 unifies the card send path and 11.10 reworks
  the ingress drop/replay lifecycle while leaving the streaming-card and reply
  delivery paths untouched.
- **Patch type:** unified diff against the installed
  `dist/.setup/monitor.account-*.mjs`
- **Install:** exact SHA-256 check; backup; atomic replace; idempotent
- **No credentials required by this repository**

> This repository ships the patch, installer and tests. It does not redistribute
> the upstream plugin bundle.

## Supported builds

| item | 2026.11.1 | 2026.11.2 / 2026.11.3 | 2026.11.5 | 2026.11.6 | 2026.11.7 | 2026.11.9 | 2026.11.10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| plugin | `@openclaw/feishu@2026.11.1` | `@openclaw/feishu@2026.11.2`, `@openclaw/feishu@2026.11.3` | `@openclaw/feishu@2026.11.5` | `@openclaw/feishu@2026.11.6` | `@openclaw/feishu@2026.11.7` | `@openclaw/feishu@2026.11.9` | `@openclaw/feishu@2026.11.10` |
| pristine bundle | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` | `8d5cfbd6d9baf330da775a20850de522e62802d211d43f8af91f5063266d9e07` | `36a2c58e4e0b8887e372cf881321c4c0c876a35e9039f5b6b72326122d29517c` | `1bee687d4849b1628d536ee8490f66b6ae761d2bfc980fd24ffaa53a4259d74e` | `359a1e8eb4e072a0f6cccd3f0b7cb63a4cec4194d678e87c286737a4bab5b880` | `b29209583f72f4469788834539de9a28c7ecef4f2366c82da95b1a7760a75cdc` |
| patched bundle | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` | `9c88ab9bd55e443d38c6c7f6e5bcbe2c47b5847c459f37a768d00a01e1cb2032` | `a8d6d9fab77b8ad8ab9545e14e38e9cc00a8ee5c4cfeb267639ea992c5c16781` | `343976b23d06fd98b08679cc8a9d3b04ecb4e4904312f0452b01cc33c007b0b1` | `829b2491e276ddd9c914c77be8e4f528a3a76b6cb5204e170c7c8f6d83e5f527` | `d40ad4e16ecd0f15312eb6d89a2803aa8e6f22708560e1e79b03be527c4c83df` |
| patch | `485950c853b37ede8fa02da5a53a8be064f119a212ff4e6294a11b9d1006c1dd` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` | `8164c44d84f965d318285adaec2f95b68284b24dae33c52e3d2a60b74a24570c` | `83f827ed1f24bbb0785c80115a3423299f2a9768de69d070e87235575d2477ce` | `14095f5b37f955632e069385c5e657fb702d4a1fa826c81b08707bf58def5d9e` | `55e3f7ebafcd2f0d680bd278e205c27f54b2852d615dc8b3c1fc1d18040eb590` | `9cea9f667ede1a01bd8e7a516236c863f52427655ae3c328511c9ea3981c5395` |
| patch hunks | 32 | 32 | 31 | 31 | 32 | 32 | 34 |
| test assertions | 221 | 221 | 221 | 221 | 221 | 221 | 221 |

The installer selects the patch by the target's SHA-256. It accepts a pristine
2026.11.1/2026.11.2/2026.11.3/2026.11.5/2026.11.6/2026.11.7 bundle, the **current** patched bundle, and any earlier
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

2026.11.9 is a sizeable but mostly mechanical upstream delta on top of
2026.11.7 (bundle 244117 -> 244682 bytes, +217/-213 lines in 48 regions): the
section markers revert from `//#region` to `// <path>`, `dedup-state`/`dedup`
and the broadcast claim helper move earlier, `bot-context-visibility` is
extracted from `bot.ts`, the card message send moves into a shared
`sendFeishuMessage()` helper, durable ingress gains `deferredLaneOccupancy:
"release"` with a deferred/handoff wait, and `handleFeishuMessage` carries
`command` turn metadata. The streaming-card class (`putElement()` reopen,
`writeContent`, `closeWithResult`) and the reply-delivery hook are unchanged, so
the reviewed 11.7 change set survives with one three-way conflict (the
section-marker block); result: 32 hunks. The 11.9 patch additionally ships layout v4
(answer-only content, reasoning in the panel, stable status line, green
completion, counted panel title); older builds keep layout v3.

2026.11.10 is a smaller upstream delta on top of 2026.11.9 (bundle 244682 ->
246305 bytes, 32 diff regions, +148/-96): the broadcast/durable-ingress
settlement gains a `drop` terminal state with per-lane `dropped` status and an
`onDropped` lifecycle, several internal caches/backoffs switch from
`Date.now()` to `performance.now()`, card-action replay protection moves to a
persistent `createChannelReplayGuard()`, card quick actions normalize their
command text through `agentControlText()`, and the binding route uses the chat
id as its conversation id. The streaming-card class (`putElement()` reopen,
`writeContent`, `closeWithResult`), the reply-delivery hook and the layout-v4
card builders are untouched, so the reviewed 11.9 change set lands with a
zero-conflict merge: 32 hunks; the 2026-11-25 v4.1 correctness pass
(audit 5.1-5.8) keeps the same 32 hunks, patched SHA-256 `5e133638…`
(v4: `983a3cc5…`); the same-day v4.2 polish pass (batch C) lands on
`cf45c522…`, and the v4.3 Knowledge-fix pass on `3ba2f9c2…`.

2026.11.7 is the streaming-window release (bundle 243155 -> 244117 bytes): a
card's 10-minute streaming window is no longer terminal. Upstream adds
`putElement()`, which recognises `200850`/`300309`, reopens the card with two
`settings` PATCHes (`streaming_mode: false` then `true`) and retries the write
once; `assertSuccessfulCardKitResponse()` now parses HTTP 400 bodies so that
CardKit code survives, and `queueStreamingUpdate()` skips a replayed delta
preview block instead of appending it twice. The same delta also drops the
`@name` stripping in the command probe, passes `mediaAccess` to media sends and
renames two internal chunks. Because the reopen lives in the card-write layer,
the 11.7 patch routes every write it adds (`content`, `#progress`,
`#detailspanel_body`, `note`) through `putElement()`: a 14-minute tool turn now
keeps updating the same card instead of freezing at 10:00. Seven three-way merge
conflicts were reviewed (all in the card-write/close/preview paths); result:
32 hunks.

## Card layout (layout v4 on 2026.11.9; older builds keep v3)

```
[header]                          optional title + template
  ① markdown #content             answer only (no status line, no thinking)
  ② markdown #progress            one stable status line:
                                  ⏳ 预热行（六选一随机）/ 🔧 N 个工具 · 12s /
                                  ✍️ 生成回复中… / ✅ 完成 · N 个工具 · 2m03s
  ③ hr #divider                   the only horizontal rule
  ④ collapsible_panel             collapsed 「🧾 过程记录 · N」
       markdown #detailspanel_body   groups + code-span tool rows
  ⑤ markdown #note                optional grey identity footer (no extra hr)
```

Layout v4 keeps the card calm while work runs: `#content` is answer-only,
reasoning is written into the collapsible panel body as `💭 思考`, and the
status line has a fixed `icon · count · elapsed` shape so it does not reflow on
every tool — the running tool is shown inside the panel as a `🔧 执行中` line.
Tool rows use code spans (e.g. `- git status --short ×2`),
the collapsed panel title carries the tool count (`🧾 过程记录 · 12`), the
completion line is green and a failed reply writes a red `⚠️ 回复失败` line. The
identity note sits under the panel without an extra divider.

Prewarm: the patch creates the card in `onReplyStart`, writes the static
one `⏳` prewarm line (six variants, random per turn) into `#progress` as soon as the card is ready, and clears it
(zero-width space) when the first token, reasoning chunk or tool event arrives.
No animation, no extra API calls beyond that one write.

Thinking: while the model reasons, the reasoning text is written into the
collapsed panel body (`💭 思考` / blockquote lines); `#content` stays empty. The
first answer characters go to `#content` and never carry the reasoning, so the
live card and the closed card read the same. A turn that produced no answer
(aborted / held close) keeps a `💭 思考记录` panel so the card is never blank.

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

At close, the panel element is replaced once with `🧾 过程记录 · N` and the
final groups; a turn with no tools and no reasoning deletes the panel and the
divider so a plain Q&A card has no empty panel.

Older builds (11.1/11.2/11.5/11.6/11.7) keep layout v3: the `💭 **Thinking**`
blockquote lives in `#content` while reasoning, the panel keeps a summary line
and the completion line is grey.

## What it does

- Records every tool start from the structured `onToolStart` callback (name +
  args) and falls back to recognized tool payloads (`Exec`, `Read: ...`,
  `Web Fetch: ...`, emoji-prefixed tool summaries) when the callback is absent.
- Writes the live status into the dedicated `#progress` element as one stable
  grey line (layout v4): a `⏳` prewarm variant between reply start and the first output,
  `🔧 N 个工具 · 12s` while tools run (the running tool lives in the panel),
  `✍️ 生成回复中…` when the answer starts, `⏳ N 个工具 · 处理中…` if the bounded
  idle hold expires, and a green `✅ 完成 · N 个工具 · 2m03s` on final close. A
  failed final reply writes a red `⚠️ 回复失败` line.
- Writes the collapsed `🧾 过程记录 · N` panel with code-span tool rows grouped as
  `命令` / `文件` / `网络` / `会话` / `其他`, e.g. `**命令 · 终端**`,
  `- git status --short ×2`, and a live `🔧 执行中` row while tools run. The old
  summary line is gone (the title carries the count, the status line carries the
  elapsed time).
- Never posts a bare tool row as its own message: a recognized tool/progress payload
  that cannot join the streaming card (background process, subagent turn, raw render
  mode, card already closed) is dropped, so a long turn's tail cannot flood the chat
  with independent `Exec` / `Session Search` bubbles. The final answer still uses the
  normal delivery path.
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
- Keeps a long reply on one card on 2026.11.7: Feishu ends streaming **10
  minutes** after a card starts (first late write `200850` `card streaming
  timeout`, later ones `300309` `streaming mode is closed`), but the 11.7 write
  path (`putElement()`) reopens the card (`streaming_mode: false` then `true`)
  and retries the write once. The patch routes `content`, `#progress`,
  `#detailspanel_body` and `note` through it, so tool progress keeps updating
  after the 10-minute mark instead of freezing mid-turn. Reopen costs three
  CardKit calls once per closed window and logs `Streaming window closed;
  reopening the card`.
- Keeps a bounded terminal fallback: if the reopen itself fails (deleted card,
  repeated `200850`/`300309`), the session is marked expired, further writes
  become no-ops (no retries, no API calls), and at close the frozen card is
  deleted and the turn reports "no visible reply" so the answer is delivered as
  a normal message instead of being lost. Builds 11.1/11.2/11.5/11.6 keep the
  terminal behaviour.
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
node run-all.mjs ../patches/2026.11.10/patched.mjs
node run-all.mjs ../patches/2026.11.9/patched.mjs
node run-all.mjs ../patches/2026.11.7/patched.mjs
node run-all.mjs ../patches/2026.11.6/patched.mjs
node run-all.mjs ../patches/2026.11.5/patched.mjs
node run-all.mjs ../patches/2026.11.2/patched.mjs   # 11.3 has the same bytes
node run-all.mjs ../patches/2026.11.1/patched.mjs
```

Expected: `5/5 suites passed, 0 failed` with 221 assertions on the 2026.11.10
bundle; the v4.x-gated cases detect their build, so older builds run 181.

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
- `patches/2026.11.7/` — reviewed pristine/patched bundle pair and canonical
  patch for the 2026.11.7 monitor bundle (streaming-window reopen, 32 hunks).
- `patches/2026.11.9/` — reviewed pristine/patched bundle pair and canonical
  patch for the 2026.11.9 monitor bundle (marker revert, send refactor and
  layout v4, 32 hunks).
- `patches/2026.11.10/` — reviewed pristine/patched bundle pair and canonical
  patch for the 2026.11.10 monitor bundle (ingress drop lifecycle and clock
  refresh, 32 hunks).
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
  2026.11.3, 2026.11.5, 2026.11.6, 2026.11.7, 2026.11.9 and 2026.11.10 — 11.2
  and 11.3 share one bundle; 11.8 is not vendored). Do not apply it to a different
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
- 2026.11.10 reworks the ingress drop/replay settlement (per-lane `dropped`
  status, `onDropped` lifecycle, replay-claim commit/release), switches internal
  caches/backoffs to `performance.now()`, moves card-action replay protection to
  a persistent guard and normalizes quick-action command text. The
  streaming-card, reply-delivery and layout-v4 paths are untouched, so the 11.9
  card behaviour carries over unchanged (32 hunks; the v4.1 correctness pass
  moved the patched SHA-256 to `5e133638…`, the v4.2 polish pass to
  `cf45c522…`, the v4.3 Knowledge fix to `3ba2f9c2…`).
- 2026.11.9 reverts the section markers to `// <path>`, moves the dedupe and
  broadcast-claim modules, extracts `sendFeishuMessage()` for the card message
  send and adds `command` turn metadata / durable-ingress deferred handoff. The
  streaming-card and delivery paths are untouched, so the 11.7 patch re-anchors
  with a single reviewed conflict (32 hunks, patched SHA-256 `829b2491…`); the
  tool-row, reopen and prewarm behaviour is unchanged.
- 2026.11.7 reopens a closed streaming window (`putElement()`), parses HTTP 400
  card responses for the CardKit code and dedupes replayed delta previews. The
  patch was re-derived through a seven-conflict three-way merge: every card
  write (content, progress, panel, note) now goes through `putElement()`, the
  terminal-expiry path stays as the bounded fallback, and the reviewed layout
  contract is unchanged (32 hunks, patched SHA-256 `343976b2…`).
- `✅ 完成` is written to the progress element. If the turn falls back to a
  non-streaming static send, that static card is unchanged.
- Tool aggregation only applies to structured tool starts and the reviewed
  tool-summary shapes; errors, media payloads, narration and unknown shapes
  follow the normal delivery path.
- The panel body stays a single markdown element for both the live and the final
  render, so it works on narrow screens and never depends on `column_set`.
- The prewarm line is static, picked randomly per turn from six reviewed variants
  (`⏳ 思考中...` among them). It is cleared on the first token,
  reasoning chunk or tool event; a turn that produces no visible reply closes the
  card with the normal completion line.
- A canary deployment must be validated with one real Feishu tool turn after
  installing on a new host (single card, prewarm line, progress line,
  expandable panel, final `✅ 完成`, no residual loading).

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
# Newest backup may be the previous patch; use the pristine copy --check reports.
PRISTINE_BACKUP=$(./install.sh --check "$TARGET" | sed -n 's/.*pristine_backup=\([^ ]*\).*/\1/p')
cp -p "$PRISTINE_BACKUP" "$TARGET"
systemctl --user restart openclaw-gateway.service
```
