# Verification — openclaw-feishu-patch 2026.11.1 / 2026.11.2

Current supported builds: **`@openclaw/feishu@2026.11.2`** (current) and
**`@openclaw/feishu@2026.11.1`**.

This release ships layout v3 (dedicated progress element, divider, compact
grouped details, structured tool names and targets from `onToolStart`,
commentary on the progress line, empty-panel cleanup) plus the static
`⏳ 思考中...` prewarm line, the 250 ms streaming throttle and the per-turn
Feishu API call counter. The 2026.10.10 release is not part of this tree; hosts
still on 10.10 must upgrade the plugin before installing.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.11.1/feishu-tool-aggregation.patch` | `1f67ad1ed00bd7d8a004cf8186928881035886d608f9dc0c3d86eaa3fef4ef49` |
| `patches/2026.11.2/feishu-tool-aggregation.patch` | `530ccc57517e1b6902ecaa0ddd4b6b66fff8fe9677cbd12af975176f7012b750` |
| pristine bundle, 2026.11.1 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle, 2026.11.1 | `b7ae62a883a10d15ce5e67fdf10ec30bcee277ad6e7b38a97ca7292112bb03be` |
| pristine bundle, 2026.11.2 | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` |
| patched bundle, 2026.11.2 | `9ea34a8dbb30de75a3b3c1a39d12785c583be68010d56edba27dbf258952a63d` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported builds.

## Patch shape

| item | 2026.11.1 | 2026.11.2 |
| --- | --- | --- |
| hunks | 29 | 30 |
| forward apply | `6dbfa74b…` -> `b7ae62a8…`, 29/29 anchors unique | `44f6d50f…` -> `9ea34a8d…`, 30/30 anchors unique |
| reverse apply | `b7ae62a8…` -> `6dbfa74b…`, byte-exact | `9ea34a8d…` -> `44f6d50f…`, byte-exact |

- `tools/verify_patch.py --all=patches` -> forward and reverse byte-exact for
  both builds (`ALL_VERSIONS_APPLY_REVERSE_PASS: True`).
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
**the same 49 change blocks byte-for-byte**; only the hunk framing differs
(30 hunks instead of 29). The core side is unchanged as well:
`openclaw@2026.11.2` still forwards `replyOptions.onToolStart` in
`dist/dispatch-from-config-*.mjs` and the payload contract is still
`{ itemId, toolCallId, name, phase, args, detailMode }`.

## Layout v3 + prewarm card contract

| element | tag | purpose |
| --- | --- | --- |
| `content` | markdown | reasoning blockquote + answer only (no status line) |
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
- completion line written to `progress`; if that write fails it is folded back
  into `content` so the marker is never lost.

## Test results

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 129 assertions** against each
patched bundle (2026.11.1 and 2026.11.2):

| suite | assertions |
| --- | --- |
| parser/structured-details/content-only helpers | 43 |
| aggregation/status/details (incl. prewarm) | 21 |
| finalization/reliability (incl. api counter) | 32 |
| streaming-session shape | 27 |
| idle-hold behavior | 6 |
| **total** | **129** |

The streaming-session suite now locates the upstream module boundary by the
bare path `extensions/feishu/src/streaming-update.ts`, so it works with both the
11.1 `// <path>` and the 11.2 `//#region <path>` comment styles.

## Additional checks performed

- `node --check` on both patched bundles -> pass.
- `sha256sum -c SHA256SUMS` and `(cd patches && sha256sum -c SHA256SUMS)` ->
  all entries OK.
- `install.sh --check` on pristine 2026.11.2 -> `status=pristine version=2026.11.2`.
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA `9ea34a8d…`;
  backup created; second `--check` -> `status=patched`; second install ->
  `already patched`.
- `patch -R --dry-run` with the 11.2 patch against the patched copy -> OK.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `tools/adapt_patch.py` regeneration -> exact patched SHAs for both builds.

## Release checks

- `tools/finalize.py` -> 2 builds, current `2026.11.2`; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- Root `SHA256SUMS` covers installer, manifest, upgrades and both patches.
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
