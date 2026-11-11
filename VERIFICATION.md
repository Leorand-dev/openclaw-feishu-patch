# Verification — openclaw-feishu-patch 2026.11.1 / 2026.11.2 / 2026.11.3

Current supported builds: **`@openclaw/feishu@2026.11.3`** (current),
**`@openclaw/feishu@2026.11.2`** and **`@openclaw/feishu@2026.11.1`**.

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
| pristine bundle, 2026.11.1 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle, 2026.11.1 | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` |
| `patches/HISTORY.json` (previous patched builds) | up to 20 entries; installer `KNOWN_PATCHED` block |
| pristine bundle, 2026.11.2 | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` |
| patched bundle, 2026.11.2 | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported builds.

## Patch shape

| item | 2026.11.1 | 2026.11.2 / 2026.11.3 |
| --- | --- | --- |
| hunks | 32 | 32 |
| forward apply | `6dbfa74b…` -> `a5664b51…`, 31/31 anchors unique | `44f6d50f…` -> `2472f7a1…`, 31/31 anchors unique |
| reverse apply | `a5664b51…` -> `6dbfa74b…`, byte-exact | `2472f7a1…` -> `44f6d50f…`, byte-exact |

- `tools/verify_patch.py --all=patches` -> forward and reverse byte-exact for
  the 2026.11.1 and 2026.11.2 bundle pairs (`ALL_VERSIONS_APPLY_REVERSE_PASS: True`).
- `tools/adapt_patch.py` regenerates the exact patched bundle from each patch
  and its pristine bundle (`--expect-sha` passes for both).
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

## Layout v3 + prewarm card contract

| element | tag | purpose |
| --- | --- | --- |
| `content` | markdown | reasoning blockquote until the answer starts, then answer only (no status line) |
| `progress` | markdown | grey status, `💬` commentary, completion line and `⏳ 思考中...` prewarm |
| `divider` | hr | separates answer from the process panel |
| `detailspanel` | collapsible_panel | collapsed `🧾 过程记录`; body `detailspanel_body` |
| `detailspanel_body` | markdown | live and final: compact summary + groups with tool targets |
| `note` | markdown | optional grey identity footer |

Prewarm behaviour:

- Both supported builds create the card in `onReplyStart`; the patch writes
  `⏳ 思考中...` into `#progress` as soon as the card is ready (log line:
  `prewarm status ready`).
- The line is cleared (zero-width space write) on the first token, reasoning
  chunk or tool event; it is not animated and does not add a timer.
- `prewarmStatusLine` is reset with the streaming state so a later turn cannot
  inherit it.

Close behaviour:

- tools used: `detailspanel_body` replaced once with the final markdown body
  (summary line + compact groups); the live markdown fallback is kept if the
  replace fails.
- no tools: `detailspanel` and `divider` deleted so no empty panel remains.
- `content` is answer-only in the live card too: `> 💭 **Thinking**` is dropped
  as soon as the first answer text arrives (`buildContentText`), written through
  the element replace endpoint because the text shrinks. The closed card and the
  delivered reply content are the answer, not the reasoning. A turn with no
  answer keeps the blockquote so the card is never blank.
- completion line written to `progress`; if that write fails it is folded back
  into `content` so the marker is never lost.

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
no longer accept writes.

Behaviour now:

- `isStreamingClosedError()` classifies `200850` / `300309` (and their messages)
  as terminal, and `isRetryableCardKitError()` never retries them.
- The first terminal failure marks the session `expired`, logs one line
  (`Streaming card expired (...); card updates stopped`) and clears the pending
  flush timer. Every later progress / details / content / note write returns
  `false` before touching the network, so a dead card costs one API call.
- `closeWithResult()` on an expired session deletes the frozen card message,
  logs `Dropped expired streaming card`, returns `visibleReplySent: false` and
  does **not** PATCH `card.settings`. The normal text delivery path then posts
  the answer, so a 15-minute turn still answers — just as a message instead of a
  finished card.

## Test results

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 164 assertions** against each
patched bundle (2026.11.1 and 2026.11.2; the 2026.11.3 build carries the same
bytes, so the 11.2 result covers it):

| suite | assertions |
| --- | --- |
| parser/structured-details/content-only helpers | 46 |
| aggregation/status/details (incl. prewarm) | 21 |
| finalization/reliability (incl. api counter, answer-only content, payload lanes) | 43 |
| streaming-session shape (incl. window expiry, live shrink, write breaker) | 48 |
| idle-hold behavior | 6 |
| **total** | **164** |

The streaming-session suite now locates the upstream module boundary by the
bare path `extensions/feishu/src/streaming-update.ts`, so it works with both the
11.1 `// <path>` and the 11.2 `//#region <path>` comment styles.

## Additional checks performed

- `node --check` on both patched bundles -> pass.
- `sha256sum -c SHA256SUMS` and `(cd patches && sha256sum -c SHA256SUMS)` ->
  all entries OK.
- `install.sh --check` on pristine 2026.11.2 and 2026.11.3 ->
  `status=pristine version=<build>` (11.3 resolves to `version=2026.11.3`).
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA `2472f7a1…`;
  backup created; second `--check` -> `status=patched`; second install ->
  `already patched`.
- `patch -R --dry-run` with the 11.2 patch against the patched copy -> OK.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `tools/adapt_patch.py` regeneration -> exact patched SHAs for the reviewed
  bundle pairs.

## Release checks

- `tools/finalize.py` -> 3 builds, current `2026.11.3`; manifest, installer
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
- A turn longer than 10 minutes cannot keep a live card: Feishu ends streaming
  at the 10-minute mark. From then on the card freezes, and at close it is
  deleted and the answer arrives as a normal message. The card is not rebuilt or
  continued (a continuation card would need a second `im.message.create` and a
  second streaming window).
