# Verification — openclaw-feishu-patch 2026.11.1

Current supported build: **`@openclaw/feishu@2026.11.1`**.

This release moves the patch to 2026.11.1 and ships layout v3 (dedicated
progress element, divider, compact grouped details, structured tool names and
targets from `onToolStart`, commentary on the progress line, empty-panel
cleanup) plus the static `⏳ 思考中...` prewarm line. The 2026.10.10 release is
not part of this tree; hosts still on 10.10 must upgrade the plugin before
installing.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.11.1/feishu-tool-aggregation.patch` | `1f67ad1ed00bd7d8a004cf8186928881035886d608f9dc0c3d86eaa3fef4ef49` |
| pristine bundle, 2026.11.1 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle, 2026.11.1 | `b7ae62a883a10d15ce5e67fdf10ec30bcee277ad6e7b38a97ca7292112bb03be` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported build.

## Patch shape

- **29 hunks**, unified diff against `original.mjs`.
- Forward apply: `6dbfa74b…` -> `5d3b34d8…` (byte-exact, 29/29 anchors unique).
- Reverse apply: `5d3b34d8…` -> `6dbfa74b…` (byte-exact, 29/29 anchors unique).
- `tools/adapt_patch.py` regenerates the exact patched bundle from the patch and
  the pristine bundle (`--expect-sha` passes).
- No CRLF, no `\ No newline` markers, no malformed hunks.
- No legacy status-element symbols: `writeStatusContent`, `deleteStatusElement`,
  `statusElementEnabled`, `updateStatus` are absent.

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

- 2026.11.1 creates the card in `onReplyStart`; the patch writes
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

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 129 assertions**:

| suite | assertions |
| --- | --- |
| parser/structured-details/content-only helpers | 43 |
| aggregation/status/details (incl. prewarm) | 21 |
| finalization/reliability | 32 |
| streaming-session shape | 27 |
| idle-hold behavior | 6 |
| **total** | **129** |

Additional checks performed locally:

- `node --check` on the patched bundle -> pass.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `tools/adapt_patch.py` regeneration -> exact patched SHA `5d3b34d8…`.
- `install.sh --check` on pristine -> `status=pristine`.
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA `5d3b34d8…`;
  backup created; second `--check` -> `status=patched`; second install ->
  `already patched`.
- Tests run against the installed temporary copy -> 127/129 assertions pass.

## Release checks

- `tools/finalize.py` -> 1 build, current `2026.11.1`; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- Root `SHA256SUMS` covers installer, manifest, upgrades and the patch.
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
