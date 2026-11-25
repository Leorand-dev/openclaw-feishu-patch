# Verification — openclaw-feishu-patch 2026.11.1 / 2026.11.2 / 2026.11.3 / 2026.11.5 / 2026.11.6 / 2026.11.7 / 2026.11.9 / 2026.11.10

Current supported builds: **`@openclaw/feishu@2026.11.10`** (current),
**`@openclaw/feishu@2026.11.9`**, **`@openclaw/feishu@2026.11.7`**,
**`@openclaw/feishu@2026.11.6`**, **`@openclaw/feishu@2026.11.5`**,
**`@openclaw/feishu@2026.11.3`**, **`@openclaw/feishu@2026.11.2`** and
**`@openclaw/feishu@2026.11.1`**. 2026.11.8 is not vendored.

2026.11.3 is a mirrored build: its `monitor.account-*.mjs` is byte-identical
to the 2026.11.2 pristine bundle, so the release adds it without new patch
bytes (see "Why 2026.11.3 is a mirrored build").

This release ships layout v3 (dedicated progress element, divider, compact
grouped details, structured tool names and targets from `onToolStart`,
commentary on the progress line, empty-panel cleanup) plus the static
`⏳ 思考中...` prewarm line, the 250 ms streaming throttle and the per-turn
Feishu API call counter. The 2026.10.10 release is not part of this tree; hosts
still on 10.10 must upgrade the plugin before installing.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.11.1/feishu-tool-aggregation.patch` | `485950c853b37ede8fa02da5a53a8be064f119a212ff4e6294a11b9d1006c1dd` |
| `patches/2026.11.2/feishu-tool-aggregation.patch` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` |
| `patches/2026.11.3/feishu-tool-aggregation.patch` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` |
| `patches/2026.11.5/feishu-tool-aggregation.patch` | `8164c44d84f965d318285adaec2f95b68284b24dae33c52e3d2a60b74a24570c` |
| `patches/2026.11.6/feishu-tool-aggregation.patch` | `83f827ed1f24bbb0785c80115a3423299f2a9768de69d070e87235575d2477ce` |
| `patches/2026.11.7/feishu-tool-aggregation.patch` | `14095f5b37f955632e069385c5e657fb702d4a1fa826c81b08707bf58def5d9e` |
| `patches/2026.11.9/feishu-tool-aggregation.patch` | `55e3f7ebafcd2f0d680bd278e205c27f54b2852d615dc8b3c1fc1d18040eb590` |
| `patches/2026.11.10/feishu-tool-aggregation.patch` | `dd53eab8fdfc71859634ffb3c1b13daf1668039e40013baed975da3296c1447d` |
| pristine bundle, 2026.11.1 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle, 2026.11.1 | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` |
| `patches/HISTORY.json` (previous patched builds) | up to 20 entries; installer `KNOWN_PATCHED` block |
| pristine bundle, 2026.11.2 | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` |
| patched bundle, 2026.11.2 | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` |
| pristine bundle, 2026.11.5 | `8d5cfbd6d9baf330da775a20850de522e62802d211d43f8af91f5063266d9e07` |
| patched bundle, 2026.11.5 | `9c88ab9bd55e443d38c6c7f6e5bcbe2c47b5847c459f37a768d00a01e1cb2032` |
| pristine bundle, 2026.11.6 | `36a2c58e4e0b8887e372cf881321c4c0c876a35e9039f5b6b72326122d29517c` |
| patched bundle, 2026.11.6 | `a8d6d9fab77b8ad8ab9545e14e38e9cc00a8ee5c4cfeb267639ea992c5c16781` |
| pristine bundle, 2026.11.7 | `1bee687d4849b1628d536ee8490f66b6ae761d2bfc980fd24ffaa53a4259d74e` |
| patched bundle, 2026.11.7 | `343976b23d06fd98b08679cc8a9d3b04ecb4e4904312f0452b01cc33c007b0b1` |
| pristine bundle, 2026.11.9 | `359a1e8eb4e072a0f6cccd3f0b7cb63a4cec4194d678e87c286737a4bab5b880` |
| patched bundle, 2026.11.9 | `829b2491e276ddd9c914c77be8e4f528a3a76b6cb5204e170c7c8f6d83e5f527` |
| pristine bundle, 2026.11.10 | `b29209583f72f4469788834539de9a28c7ecef4f2366c82da95b1a7760a75cdc` |
| patched bundle, 2026.11.10 | `90f6b9d8bf3244da903fe13529350e5d07f092424437554110e8099e35b3423b` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported builds.

## Patch shape

| item | 2026.11.1 | 2026.11.2 / 2026.11.3 | 2026.11.5 | 2026.11.6 | 2026.11.7 | 2026.11.9 | 2026.11.10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hunks | 32 | 32 | 31 | 31 | 32 | 32 | 32 |
| forward apply | `6dbfa74b…` -> `a5664b51…`, 31/31 anchors unique | `44f6d50f…` -> `2472f7a1…`, 31/31 anchors unique | `8d5cfbd6…` -> `9c88ab9b…`, 31/31 anchors unique | `36a2c58e…` -> `a8d6d9fa…`, 31/31 anchors unique | `1bee687d…` -> `343976b2…`, 32/32 anchors unique | `359a1e8e…` -> `829b2491…`, 32/32 anchors unique | `b2920958…` -> `5e133638…`, 32/32 anchors unique |
| reverse apply | `a5664b51…` -> `6dbfa74b…`, byte-exact | `2472f7a1…` -> `44f6d50f…`, byte-exact | `9c88ab9b…` -> `8d5cfbd6…`, byte-exact | `a8d6d9fa…` -> `36a2c58e…`, byte-exact | `343976b2…` -> `1bee687d…`, byte-exact | `829b2491…` -> `359a1e8e…`, byte-exact | `5e133638…` -> `b2920958…`, byte-exact |

- `tools/verify_patch.py --all=patches` -> forward and reverse byte-exact for
  the 2026.11.1, 2026.11.2, 2026.11.5, 2026.11.6, 2026.11.7, 2026.11.9 and
  2026.11.10 bundle pairs (`ALL_VERSIONS_APPLY_REVERSE_PASS: True`).
- `tools/adapt_patch.py` regenerates the exact patched bundle from each patch
  and its pristine bundle (`--expect-sha` passes for all seven).
- No CRLF, no `\ No newline` markers, no malformed hunks.
- No legacy status-element symbols: `writeStatusContent`, `deleteStatusElement`,
  `statusElementEnabled`, `updateStatus` are absent from both patched bundles.

### Why 2026.11.2 re-anchors instead of re-designing

The 11.1 -> 11.2 upstream delta of `monitor.account-*.mjs` is:

- `//#region` / `//#endregion` markers around every module section (comment-only);
- renamed internal chunk imports (`doctor-contract`, `channel`, `client`, ...);
- card-action hardening: an unresolvable chat type now refuses the action
  instead of defaulting to `p2p`.

None of it touches the streaming-card, progress, details-panel or tool paths.
Re-anchoring the reviewed 11.1 patch onto the 11.2 pristine bundle reproduces
**the same change blocks byte-for-byte**; only the file offsets differ. The core
side is unchanged as well:
`openclaw@2026.11.2` still forwards `replyOptions.onToolStart` in
`dist/dispatch-from-config-*.mjs` and the payload contract is still
`{ itemId, toolCallId, name, phase, args, detailMode }`.

### Why 2026.11.3 is a mirrored build

`@openclaw/feishu@2026.11.3` bumps the package version but ships the same
compiled `.setup/monitor.account-*.mjs` as 2026.11.2 — byte for byte
(`44f6d50f…`, 260608 bytes; checked on six hosts upgraded to
`OpenClaw 2026.11.3`, build `847611d`). The 2026.11.2 patch therefore applies
unchanged and yields `2472f7a1…`. `patches/2026.11.3/` stores only the mirror
of that patch; `tools/finalize.py` maps it through `MIRRORED`, so the
manifest, installer and checksums stay generated from one reviewed pair.



### Why 2026.11.6 is a re-anchored rebuild

`@openclaw/feishu@2026.11.6` ships a new `monitor.account-*.mjs`
(243155 bytes, SHA-256 `36a2c58e…`, chunk `monitor.account-C08HBgRD.mjs`). The
11.5 -> 11.6 delta is 11 diff regions (+22/-14 lines):

- internal chunk renames (`channel-DDrdYVwq.mjs`, `monitor-CDBNol9H.mjs`);
- `normalizeFeishuCommandProbeBody()` keeps line breaks for multiline slash
  commands;
- card actions without a resolvable chat type are refused (with a Feishu notice
  telling the user to retry later) instead of defaulting to `p2p`, and the
  synthetic message event is built with the resolved chat type.

None of it touches the streaming-card, progress, panel or tool paths, so the
reviewed 11.5 patch re-anchors onto the 11.6 pristine bundle unchanged: same 31
hunks and the same change blocks, only offsets and the resulting patched SHA-256
(`a8d6d9fa…`) differ. The card-action hardening is upstream-only behaviour that
this patch does not modify.

### Why 2026.11.10 re-anchors without conflicts

`@openclaw/feishu@2026.11.10` ships a new `monitor.account-*.mjs`
(246305 bytes, SHA-256 `b2920958…`, chunk `monitor.account-x_KliB35.mjs`). The
11.9 -> 11.10 delta is 32 diff regions (+148/-96):

- the broadcast/durable-ingress settlement gains a `drop` terminal state, a
  per-lane `dropped` status, `onDropped` lifecycle plumbing and replay-claim
  commit/release on drop;
- internal caches/backoffs (bot-name cache, streaming-start backoff, reaction
  cache) switch from `Date.now()` to `performance.now()`;
- card-action replay protection moves from an in-memory token map to a
  persistent `createChannelReplayGuard()`, quick-action commands normalize
  through `agentControlText()`, and the invalid-interaction notices are
  consolidated;
- the binding route uses the chat id as its conversation id and `CommandTurn`
  is dropped when no dispatcher exists;
- module/chunk reshuffles (`bot-context-visibility` removed, a new `async-*`
  chunk, renamed `channel`/`chat`/`monitor` chunks, `reply-delivery-result` grew
  by ~3.5 KB).

The streaming-card class (`putElement()` reopen, `writeContent`,
`closeWithResult`), the reply-delivery hook and the layout-v4 card builders are
untouched. The three-way merge (base = 11.9 pristine, ours = 11.9 layout-v4
patched, theirs = 11.10 pristine) therefore produces **zero conflicts**; the
11.9 -> 11.10 diff of the patched bundle equals the upstream delta line for line
(+148/-96), so all 32 reviewed change blocks carry over unchanged. Result: 32
hunks, patched SHA-256 `983a3cc5…`; the 2026-11-25 v4.1 correctness pass
(audit 5.1-5.8) keeps the same 32 hunks and moves the patched SHA-256 to
`5e133638…`, the same-day v4.2 polish pass (batch C) to `cf45c522…`, and the
v4.3 Knowledge fix to `3ba2f9c2…`.
Layout v4, the reopen path, the tool-row
suppression and the prewarm line are unchanged.

### Why 2026.11.9 is a re-anchored rebuild

`@openclaw/feishu@2026.11.9` ships a new `monitor.account-*.mjs`
(244682 bytes, SHA-256 `359a1e8e…`, chunk `monitor.account-DV7uU1MA.mjs`). The
11.7 -> 11.9 delta is 48 diff regions (+217/-213) and is mostly structural:

- section markers revert from `//#region` / `//#endregion` to `// <path>`;
- `dedup-state.ts` / `dedup.ts` and the broadcast-claim helper move earlier in
  the bundle; `bot-context-visibility.ts` is extracted from `bot.ts`;
- the card message send moves from an inline `requestFeishuApi()` call into a
  shared `sendFeishuMessage()` helper imported from the delivery chunk;
- durable ingress gains `deferredLaneOccupancy: "release"` plus a
  deferred/handoff wait (`racePromiseWithAbortSignal`), reaction synthesis
  resolves a missing chat type via `getChatInfo`, and `handleFeishuMessage`
  carries `command` turn metadata.

The streaming-card class (`putElement()` reopen, `writeContent`,
`closeWithResult`), the reply-delivery hook, the tool aggregation and the
`#progress`/panel paths are unchanged. A three-way merge (base = 11.7 pristine,
ours = 11.7 patched, theirs = 11.9 pristine) therefore produces exactly one
conflict, on the section-marker block around
`STREAMING_UPDATE_THROTTLE_MS`: the resolution keeps the 11.9 marker style and
the patch's 250 ms throttle. The 11.7 -> 11.9 diff of the patched bundle equals
the upstream delta line for line (+217/-213), so all 32 reviewed change blocks
survive. Result: 32 hunks, patched SHA-256 `829b2491…`. Card behaviour (reopen,
tool rows, prewarm, progress line) is unchanged.

### Why 2026.11.7 is a re-anchored rebuild

`@openclaw/feishu@2026.11.7` ships a new `monitor.account-*.mjs`
(244117 bytes, SHA-256 `1bee687d…`, chunk `monitor.account-CTBV_Rk9.mjs`). The
11.6 -> 11.7 delta is 12 diff regions (+59/-27 lines) and it touches the
streaming-card path, so the patch had to be re-derived, not merely re-anchored:

- `putElement()` recognises a closed streaming window (`STREAMING_CLOSED_ERROR`
  matches `(code=200850|300309)` at the end of the error), reopens the card with
  two `settings` PATCHes (`streaming_mode: false`, then `true`) and retries the
  PUT once;
- `assertSuccessfulCardKitResponse()` no longer throws on HTTP 400 before
  reading the body, so the CardKit code is available for that decision;
- `updateSettings()` is shared by close and reopen;
- `queueStreamingUpdate()` keeps `previewText`/`previewBlockOffset` and skips a
  replayed delta preview block instead of appending it twice;
- `normalizeFeishuCommandProbeBody()` drops the `@name` stripping, media sends
  pass `mediaAccess`, and two internal chunks are renamed.

The three-way merge (base = 11.6 pristine, ours = 11.6 patched, theirs = 11.7
pristine) produced seven conflicts, all in paths this patch rewrote:
`writeCardContent`, `deleteElementForced`, `updateNoteContent`,
`closeWithResult` (twice), `queueStreamingUpdate` and `onAssistantMessageStart`.
Resolution keeps the patch's layout/progress/panel work and moves every card
write onto the new `putElement()` primitive: `writeCardContent`,
`putElementPayload` and `updateNoteContent` become thin payload builders, while
`putElementWithRetry()` only retries transient 408/429/5xx failures (a closed
window is retried once by `putElement()` itself). The terminal-expiry path
remains as the bounded fallback when the reopen fails. Result: 32 hunks.

The first 11.7 fleet build (`d85f3070…`) still let the chat fill with independent
bubbles during a long turn whose streaming card had already closed: recognized
tool/progress payloads (`Exec`, `Session Search: …`, `Process: <subagent>:<run>`,
`Write: to …`, …) were parsed, failed to join any streaming card (background /
subagent delivery, closed card), and then fell through to the normal text path as
one `post` message each. The follow-up fix keeps the parsed-tool branch terminal:
when a row cannot join a card it is dropped, so the final reply still arrives but no
bare tool row can become its own bubble. The patch is re-hashed as `343976b2…`
(same 32 hunks) and all six fleet hosts were re-deployed with it.

### Why 2026.11.5 re-anchors instead of mirroring

`@openclaw/feishu@2026.11.5` genuinely rebuilds `monitor.account-*.mjs`
(242935 bytes, SHA-256 `8d5cfbd6…`, chunk name `monitor.account-B6_SNuhx.mjs`).
The 11.2 -> 11.5 delta is a refactor, not a marker/rename delta:

- helpers moved into the plugin SDK (`readProviderJsonResponse`, `sha256Hex`,
  `enqueueKeyedTask`, `sendJson`, `createStaleWhileRevalidateCache`,
  `truncateWithMarker`, `safeParseJson`, `sliceUtf16Safe`);
- the bespoke `FeishuStreamingFinalizationError` is gone: the card close path
  now returns a channel delivery result and reports partial delivery through
  `createFeishuPartialReplyDeliveryError`;
- the dispatcher gained a core-driven `model-wait` progress lane
  (`modelWaitLine`), and `queueStreamingUpdate` switched from an options object
  to a mode string.

The 11.5 patch was derived with a three-way merge (base = 11.2 pristine, ours =
11.2 patched, theirs = 11.5 pristine), nine reviewed conflicts, then the full
test matrix and a forward/reverse byte-exact check. It is 31 hunks instead of 32
because the upstream refactor removed one anchor region. `model-wait` text is
routed onto the `#progress` line (never into `#content`); the rest of the layout
v3 contract is unchanged.

## Layout v4 + prewarm card contract (2026.11.9)

| element | tag | purpose |
| --- | --- | --- |
| `content` | markdown | answer only (no status line, no reasoning) |
| `progress` | markdown | one stable status line: prewarm, `🔧 N 个工具 · 12s`, `✍️ 生成回复中…`, green `✅ 完成 · N 个工具 · 2m03s`, red failure |
| `divider` | hr | the only horizontal rule (between status line and panel) |
| `detailspanel` | collapsible_panel | collapsed `🧾 过程记录 · N`; body `detailspanel_body` |
| `detailspanel_body` | markdown | `💭 思考` while reasoning; live `🔧 执行中` + groups; final groups with code-span rows |
| `note` | markdown | optional grey identity footer (no extra divider) |

Layout v4 (11.9 patch only; 11.1/11.2/11.5/11.6/11.7 keep layout v3) changes
the card rhythm:

- `#content` is answer-only; reasoning is written into the collapsed panel body
  (`buildThinkingPanelBody`), so the card never shows a blockquote above the
  answer.
- the status line has a fixed `icon · count · elapsed` shape and no longer shows
  the current tool, so it stops reflowing on every tool event; the running tool
  is the `🔧 执行中 · code` line at the top of the panel body.
- tool rows use code spans; the panel body has no summary line (the title carries
  the count, the status line carries elapsed time).
- the completion line is `<font color='green'>✅ 完成 …</font>`; a failed final
  reply writes `<font color='red'>⚠️ 回复失败</font>`.
- the identity note has no `hr` above it.

Prewarm behaviour:

- The patch writes `⏳ 思考中...` into `#progress` as soon as the card is ready
  (log line: `prewarm status ready`); it is cleared (zero-width space) on the
  first token, reasoning chunk or tool event and is not animated.
- `prewarmStatusLine` is reset with the streaming state so a later turn cannot
  inherit it.

Close behaviour:

- tools used: the whole `detailspanel` element is replaced once with
  `🧾 过程记录 · N` plus the final groups; the body fallback keeps the live
  markdown if the panel replace fails.
- no tools, no reasoning: `detailspanel` and `divider` are deleted.
- no tools but reasoning: a `💭 思考记录` panel is kept so the card is not blank.
- `content` is answer-only; the closed card and the delivered reply content are
  the answer.
- the completion line is written to `progress` in green; if that write fails it
  is folded back into `content` so the marker is never lost.

## Streaming window expiry (long turns)

Feishu ends a card's streaming window **10 minutes** after the card is created.
The first write after that returns code `200850` (`ErrMsg: card streaming
timeout`) and every later one `300309` (`ErrMsg: streaming mode is closed`).

Observed before the fix, on a 15-minute turn (host 79, 2026-11-09):

| time | event |
| --- | --- |
| 16:46:29 | `Started streaming` (card created) |
| 16:56:29 | first `200850` — exactly 600 s after the card start |
| 16:56:29–17:05:02 | 222 failed writes, 130 progress + 46 panel + 46 content |
| 17:05:02 | `turn api calls: total=399 card=396 message=1 reaction=2` |
| 17:05:03 | `Discarded streaming card` |

So roughly half of that turn's 396 card calls were wasted on a card that could
no longer accept writes. The same failure hit the 2026.11.6 build on host 90 on
2026-11-23: a 14-minute turn made 155 card calls, the card expired exactly 600 s
after creation on a `#progress` write, the turn ended at 07:10:59 and the frozen
card was dropped at 07:11:00, so the answer arrived as a plain message.

Behaviour on 2026.11.7:

- `putElement()` classifies `200850` / `300309` as a closed window, reopens the
  card (`settings`: `streaming_mode: false` then `true`) and retries the write
  once; `isRetryableCardKitError()` still never treats those codes as transient
  retries.
- The patch routes `content`, `#progress`, `#detailspanel_body` and `note`
  writes through `putElement()`, so progress and panel writes recover too — not
  just the answer text. A reopen costs three CardKit calls (two settings PATCHes
  and the retried write) per closed window, i.e. once per 10 minutes per card.
- Reopen is observable: `Streaming window closed; reopening the card` is logged
  and those calls are included in the per-turn `card` counter.
- Fallback: if the reopen itself fails, the session is marked expired, later
  writes are no-ops (one failed call, no retries), `closeWithResult()` deletes
  the frozen card and reports `visibleReplySent: false`, so the normal text
  delivery posts the answer.

Builds 11.1/11.2/11.5/11.6 keep the terminal-expiry behaviour they shipped with:
`isStreamingClosedError()` classifies the two codes as terminal, the first
failure marks the session `expired`, every later write returns `false` before
touching the network, and close deletes the frozen card and reports no visible
reply.

## Test results

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 216 assertions** against the
2026.11.10 bundle; the v4.1-gated cases detect their build, so the older
patched bundles (2026.11.1, 2026.11.2, 2026.11.5, 2026.11.6, 2026.11.7,
2026.11.9) run 181 assertions each (the 2026.11.3 build carries the same bytes
as 11.2, so the 11.2 result covers it):

| suite | assertions |
| --- | --- |
| parser/structured-details/content-only helpers | 61 |
| aggregation/status/details (incl. prewarm) | 28 |
| finalization/reliability (incl. api counter, answer-only content, payload lanes, reopen policy, tool-row drop) | 54 |
| streaming-session shape (incl. window expiry/reopen, live shrink, write breaker) | 67 |
| idle-hold behavior | 6 |
| **total** | **216** |

The two version-sensitive suites are branch-aware: `hasReopen` detects the 11.7
`putElement()` layer, so 11.7 asserts the reopen/retry policy while the older
builds assert the terminal-expiry policy, with the same assertion count. The
streaming-session suite locates the upstream module boundary by the bare path
`extensions/feishu/src/streaming-update.ts`, so it works with both the 11.1
`// <path>` and the 11.2+ `//#region <path>` comment styles.

## Additional checks performed

- `node --check` on both patched bundles -> pass.
- `sha256sum -c SHA256SUMS` and `(cd patches && sha256sum -c SHA256SUMS)` ->
  all entries OK.
- `install.sh --check` on pristine 2026.11.2, 2026.11.3, 2026.11.5, 2026.11.6,
  2026.11.7, 2026.11.9 and 2026.11.10 -> `status=pristine version=<build>`
  (11.3 resolves to `version=2026.11.3`, 11.5 to `version=2026.11.5`, 11.6 to
  `version=2026.11.6`, 11.7 to `version=2026.11.7`, 11.9 to
  `version=2026.11.9`, 11.10 to `version=2026.11.10`).
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA `2472f7a1…`
  (2026.11.2), `9c88ab9b…` (2026.11.5) and `a8d6d9fa…` (2026.11.6); backup
  created; second `--check` ->
  `status=patched`; second install -> `already patched`.
- `patch -R --dry-run` with the 11.2 patch against the patched copy -> OK;
  same for the 11.5 patch (`8d5cfbd6…` <-> `9c88ab9b…`), the 11.6 patch
  (`36a2c58e…` <-> `a8d6d9fa…`), both 31 hunks, and the 11.7 patch
  (`1bee687d…` <-> `343976b2…`), 32 hunks, the 11.9 patch
  (`359a1e8e…` <-> `829b2491…`), 32 hunks, and the 11.10 patch
  (`b2920958…` <-> `5e133638…`), 32 hunks.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `tools/adapt_patch.py` regeneration -> exact patched SHAs for the reviewed
  bundle pairs.

## Fleet deployment (2026-11-21)

The 2026.11.6 patch was installed on the production fleet (five Linux hosts and
one macOS host, all on `OpenClaw 2026.11.6`, build `06afb10`). Every host reports
`status=patched version=2026.11.6`, keeps one pristine `.monitor.backup-*.mjs`
(`36a2c58e…`) for rollback, passes `5/5` suites, and returns `200` from the
gateway health endpoint after the restart; the plugin log shows
`starting feishu[default] (mode: websocket)` plus a resolved bot `open_id`.

## Fleet deployment (2026-11-23)

The 2026.11.7 patch was deployed to the five Linux hosts (all on
`OpenClaw 2026.11.7`, build `e31bbf0`, plugin `@openclaw/feishu@2026.11.7`)
after the plugin upgrade had reset their monitor bundles to pristine. The
rollout was canaried on one host before the other four. Every host reports
`status=patched version=2026.11.7` with bundle SHA-256 `343976b2…` (279915
bytes), keeps one pristine `.monitor.backup-*.mjs` (`1bee687d…`) for rollback,
passes `5/5` suites (181 assertions), and returns `200` from the gateway health
endpoint after the restart; the plugin log shows
`starting feishu[default] (mode: websocket)` plus a resolved bot `open_id` and
`WebSocket client started`.

The macOS host followed on 2026-11-24 (`OpenClaw 2026.11.7`, build `393b8ff`,
bun runtime 1.4.4): it also reports `status=patched version=2026.11.7`, bundle
`343976b2…` (279915 bytes), one pristine backup (`1bee687d…`), `5/5` suites
(181 assertions), health `200` and `launchd state=running`. All six fleet hosts
run the 11.7 patch; the tool-row suppression follow-up was re-deployed to all of
them. In-place upgrades leave two backups on each host (the previous `d85f3070…`
patch and the pristine `1bee687d…` copy); `install.sh --check` prints the
`pristine_backup=` path, which is the file to restore for a rollback. No `200850`/`300309` event had been logged by then, so
the reopen path still awaits its first real >10-minute turn.

## Fleet deployment (2026-11-25)

The 2026.11.9 patch was deployed to all six hosts (five Linux, one macOS, all on
`OpenClaw 2026.11.9`, build `0032b1d`, plugin `@openclaw/feishu@2026.11.9`) after
the plugin upgrade had reset their monitor bundles to pristine `359a1e8e…`
(244682 bytes). The rollout was canaried on one host first. Every host reports
`status=patched version=2026.11.9` with bundle SHA-256 `829b2491…` (281793
bytes), keeps the pristine `.monitor.backup-*.mjs` (`359a1e8e…`) for rollback
(and the previous 11.9 build as a second backup after the in-place upgrade),
passes `5/5` suites (181 assertions), and returns `200` from the gateway health
endpoint after the restart; the plugin log shows
`starting feishu[default] (mode: websocket)` plus a resolved bot `open_id` and
`WebSocket client started`.

The layout-v4 build (`829b2491…`) was rolled out to the same six hosts after the
v4 card refactor: answer-only `#content`, reasoning in the collapsible panel,
one stable `🔧 N 个工具 · elapsed` status line, counted panel title, green
completion and red failure line, code-span tool rows and no extra dividers.
Every host moved from the v3 11.9 build (`67d9af33…`) in place via the pristine
backup and reports `status=patched version=2026.11.9` with the v4 bundle.

Real-turn check (layout v4, host 90, 2026-11-25 12:06-12:13 local): the v4
gateway (started 12:06:33) served a `/new` command through one streaming card
(`Started streaming` 12:12:29 -> `Closed streaming` 12:12:32, prewarm line
present) and opened the health-check turn as a single streaming card at
12:13:05 (`cardId=7711957309862497305`, `prewarm status ready`). The Feishu
message list for the chat shows only `interactive` card messages for these
turns and no standalone `post` tool rows after the v4 build went live, so the
tool-row suppression still holds. The visual layout was confirmed by the
operator on the real client (answer-only content, reasoning inside
`🧾 过程记录`, stable status line, counted panel title, green completion).

## Fleet deployment (2026-11-25, 11.10)

The 2026.11.10 patch was deployed to the four Linux hosts that had been upgraded
(`OpenClaw 2026.11.10`, build `6ea542f`, plugin `@openclaw/feishu@2026.11.10`),
canaried on one host first. Each reports `status=patched version=2026.11.10`
with bundle SHA-256 `983a3cc5…` (283416 bytes), keeps one pristine
`.monitor.backup-*.mjs` (`b2920958…`) for rollback, passes `5/5` suites (181
assertions) and returns `200` from the gateway health endpoint after the
restart; the plugin log shows `starting feishu[default] (mode: websocket)` plus a
resolved bot `open_id` and `WebSocket client started`.

The remaining two hosts (2026.11.9) keep the v4 11.9 patch (`829b2491…`) and
move to the 11.10 patch after their plugin upgrade. Layout v4, the reopen path,
tool-row suppression and the prewarm line are identical on both builds.

## Release checks

- `tools/finalize.py` -> 8 builds, current `2026.11.10`; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- Root `SHA256SUMS` covers installer, manifest, upgrades and all patches.
- Installer no-upgrade path is bash 3.2 compatible (`${UPGRADES[@]-}`).
- `tools/check_docs.py` -> release checks OK.
- Public-tree hygiene: no hostnames, private IPs, absolute paths or credentials.

## Known limits

- A live Feishu turn is required to confirm the rendered card on a real client:
  prewarm line, progress line placement, compact grouped panel, tool targets and
  the empty-panel removal. Static tests cover the request payloads, not the
  client rendering.
- The `✅ 完成` line applies to the streaming card. A non-streaming static
  fallback card is unchanged.
- Tool rows come from structured `onToolStart` events, with recognized
  tool-summary payloads as the fallback; errors, media, narration and unknown
  payload shapes follow the normal delivery path.
- The panel body is a single markdown element for both renders; no `column_set`
  is used, so the layout is identical on narrow screens.
- The prewarm text is intentionally static (`⏳ 思考中...`); no dot animation and
  no timer.
- The 24-second bounded idle hold is unchanged from the previous release.
- The 11.7 reopen path is covered by unit tests (settings toggle + retried
  write) and a smoke harness, but a real >10-minute Feishu turn is still the only
  end-to-end proof. Watch the first such turn for duplicated text or a reset
  progress/panel element after a reopen; if either appears, the fix is to force
  one element-replace resync after `Streaming window closed; reopening the card`.
- Builds 11.1/11.2/11.5/11.6 keep the terminal behaviour: a turn longer than 10
  minutes freezes the card, close deletes it and the answer arrives as a normal
  message.

## 2026-11-25 v4.1 correctness pass (audit 5.1-5.8) + v4.2 polish pass (batch C)

The 2026-11-25 code-correctness audit (see the audit report) found the panel
tool count could double-count a tool call (guard lagged one HTTP round trip),
the summary lane dropped command detail, the content-write breaker never
recovered, the closed-window judges disagreed, sequence numbers could be
re-read after the token await, and 7 classes of secrets missed redaction.
The v4.1 pass (batch A+B) fixes all of these in the 2026.11.10 patch: the same
32 hunks, patched SHA-256 `5e133638…` (v4: `983a3cc5…`, retained in
`HISTORY.json` for in-place upgrade), 201 assertions. The same-day v4.2 pass
(batch C) adds: HTTP 429 fails fast (single attempt), live panel rows get one
attempt, identical in-flight status lines are not re-sent, panel-write
failures escalate to `runtime.error`, raw/non-preview modes keep tool rows on
the normal message path, the live row no longer echoes the running command,
the dropped-events note is no longer a list item, `lastWriteError` is passed
per call instead of a shared field, `command` aliases to `exec`, and the
sessions/conversations tool names align with the upstream
`TOOL_DISPLAY_CONFIG`. Final patched SHA-256
`90f6b9d8bf3244da903fe13529350e5d07f092424437554110e8099e35b3423b`, patch
SHA-256 `dd53eab8fdfc71859634ffb3c1b13daf1668039e40013baed975da3296c1447d`.

- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact (8 builds).
- `tools/check_docs.py` -> release checks OK (216 assertions, 3 docs).
- `tests/run-all.mjs` -> **5/5 suites, 0 failed, 216 assertions** against the
  v4.2 bundle (v4.x-gated cases detect their build; older bundles run 181).
- Fleet rollout 23:0x-23:1x local: 79/75/18/19/43 each upgraded in place from
  `983a3cc5…` to `5e133638…` (`--check` reports `status=patched`,
  no `outdated` flag), remote run-all 5/5 with 201 assertions, gateway
  restarted outside any open turn, health `200`, `NRestarts=0`, feishu
  websocket reconnects confirmed. Host 90 (iMac, plugin 2026.11.9) still needs
  the 11.10 plugin upgrade before this patch applies.

## 2026-11-25 v4.3 Knowledge fix (per-turn standalone tool messages)

While exercising the fleet, the 23:41 local turn on 79 emitted 12 messages
(`total=100 card=86 message=12`): the stock openclaw **knowledge** extension
(tools `knowledge_record` "Knowledge Record" / `knowledge_remember`
"Knowledge Remember") was never on `BARE_TOOL_LABELS`, so its tool summaries
escaped the drop lane and rendered as standalone cards. The same leak predates
v4.2 (a 23:13 turn on the v4 bundle already shows `message=2`); the new
workload just called the tool 11 times in one turn. Panel writes were healthy
all day (zero failure log lines), ruling out the fallback chain.

- Fix: `knowledge_record`/`knowledge_remember` added to the bare label set
  (icons 📖/🧠, display names 知识记录/知识记忆), plus a generic fallback — a
  verified kind=tool single-line summary with a title-shaped label (uppercase
  start, ≤4 words) joins the panel instead of leaking, known or not. With the
  v4.1 structured guard in place the fallback mainly suppresses the leak; the
  panel row still comes from the structured lane with real args detail.
- Same 32 hunks, patched SHA-256 `90f6b9d8bf3244da903fe13529350e5d07f092424437554110e8099e35b3423b`,
  patch SHA-256 `dd53eab8fdfc71859634ffb3c1b13daf1668039e40013baed975da3296c1447d`.
- `tools/verify_patch.py --all=patches` -> 8 builds forward/reverse byte-exact;
  `tools/check_docs.py` -> release checks OK (214 assertions); run-all 5/5 with
  214 assertions on the v4.3 bundle (older bundles keep 181).

## 2026-11-25 v4.4 prewarm rotation

The prewarm line `⏳ 思考中...` was the only variant. Per user request the
constant became a reviewed set of six, with one random pick per turn (the
dispatcher is instantiated per inbound message, so the pick is per-turn):

- `⏳ 思考中...`（原句保留）
- `⏳ 正在思考...` / `⏳ 想一想...` / `⏳ 理清思路中...` / `⏳ 稍等片刻...` / `⏳ 组织答案中...`

Still a single static write with no animation and no timer; the variable name
`PREWARM_STATUS_LINE` is kept as the per-turn pick so extraction-based tests are
unchanged. Same 32 hunks, patched SHA-256
`90f6b9d8bf3244da903fe13529350e5d07f092424437554110e8099e35b3423b`, patch
SHA-256 `dd53eab8fdfc71859634ffb3c1b13daf1668039e40013baed975da3296c1447d`,
216 assertions (adds per-turn pick + set-membership checks). Fleet rolled
`3ba2f9c2…` -> `c7d2f94b…` on 75/79/18/19/43, remote run-all 5/5 with 216
assertions, health 200 (75 on its usual second probe), `NRestarts=0`.

## 2026-11-26 v4.5 prewarm icon rotation

Per user request the prewarm icon rotates too: the single `⏳` became a reviewed
set of eight (⏳ 🤔 💭 🧠 ⚡ ✨ ☕ 🔮), combined per turn with the six reviewed
texts — 48 combinations, still one static write, no animation, no timer, and the
first real output still clears the line. Icons already carrying meaning
elsewhere on the card (🔧 ✍️ ✅ ⚠️ 💬 🧾) are deliberately excluded. Same 32
hunks, patched SHA-256
`90f6b9d8bf3244da903fe13529350e5d07f092424437554110e8099e35b3423b`, patch
SHA-256 `dd53eab8fdfc71859634ffb3c1b13daf1668039e40013baed975da3296c1447d`,
216 assertions (the two prewarm assertions now pin the icon/text arrays and the
combined pick). Fleet rolled `c7d2f94b…` -> `90f6b9d8…` on 75/79/18/19/43,
remote run-all 5/5, health 200 (75 on its usual second probe), `NRestarts=0`.
