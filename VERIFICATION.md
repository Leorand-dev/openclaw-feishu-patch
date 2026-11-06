# Verification — openclaw-feishu-patch 2026.11.1

Current supported build: **`@openclaw/feishu@2026.11.1`**.

This release moves the patch to 2026.11.1 and ships layout v2 (dedicated
progress element, divider, grouped details, final `column_set`, empty-panel
cleanup) plus the static `⏳ 思考中...` prewarm line. The 2026.10.10 release is
not part of this tree; hosts still on 10.10 must upgrade the plugin before
installing.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.11.1/feishu-tool-aggregation.patch` | `76c2ca26b0635b05afd114c5e404c3251785104fd68d96b1c62b9867f583f7de` |
| pristine bundle, 2026.11.1 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle, 2026.11.1 | `2ef9423eba4810cf2c7a5e5e8d7d523c8127bbfe33c2190ef6875a979135f867` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported build.

## Patch shape

- **20 hunks**, unified diff against `original.mjs`.
- Forward apply: `6dbfa74b…` -> `2ef9423e…` (byte-exact, 20/20 anchors unique).
- Reverse apply: `2ef9423e…` -> `6dbfa74b…` (byte-exact, 20/20 anchors unique).
- `tools/adapt_patch.py` regenerates the exact patched bundle from the patch and
  the pristine bundle (`--expect-sha` passes).
- No CRLF, no `\ No newline` markers, no malformed hunks.
- No legacy status-element symbols: `writeStatusContent`, `deleteStatusElement`,
  `statusElementEnabled`, `updateStatus` are absent.

## Layout v2 + prewarm card contract

| element | tag | purpose |
| --- | --- | --- |
| `content` | markdown | reasoning blockquote + answer only (no status line) |
| `progress` | markdown | grey status, completion line and `⏳ 思考中...` prewarm |
| `divider` | hr | separates answer from the process panel |
| `detailspanel` | collapsible_panel | collapsed `🧾 过程记录`; body `detailspanel_body` |
| `detailspanel_body` | markdown → column_set | live: summary + category groups; final: two columns |
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

- tools used: `detailspanel_body` replaced once with a `column_set` (left list,
  right statistics); markdown fallback kept if the replace fails.
- no tools: `detailspanel` and `divider` deleted so no empty panel remains.
- completion line written to `progress`; if that write fails it is folded back
  into `content` so the marker is never lost.

## Test results

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 99 assertions**:

| suite | assertions |
| --- | --- |
| parser/content-only helpers | 25 |
| aggregation/status/details (incl. prewarm) | 17 |
| finalization/reliability | 26 |
| streaming-session shape | 25 |
| idle-hold behavior | 6 |
| **total** | **99** |

Additional checks performed locally:

- `node --check` on the patched bundle -> pass.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `tools/adapt_patch.py` regeneration -> exact patched SHA `2ef9423e…`.
- `install.sh --check` on pristine -> `status=pristine`.
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA `2ef9423e…`;
  backup created; second `--check` -> `status=patched`; second install ->
  `already patched`.
- Tests run against the installed temporary copy -> 99/99 assertions pass.

## Release checks

- `tools/finalize.py` -> 1 build, current `2026.11.1`; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- Root `SHA256SUMS` covers installer, manifest, upgrades and the patch.
- Installer no-upgrade path is bash 3.2 compatible (`${UPGRADES[@]-}`).
- `tools/check_docs.py` -> release checks OK.
- Public-tree hygiene: no hostnames, private IPs, absolute paths or credentials.

## Known limits

- A live Feishu turn is required to confirm the rendered card on a real client:
  prewarm line, progress line placement, grouped panel, `column_set` rendering
  and the empty-panel removal. Static tests cover the request payloads, not the
  client rendering.
- The `✅ 完成` line applies to the streaming card. A non-streaming static
  fallback card is unchanged.
- Only recognized tool-summary payloads are aggregated; errors, media,
  narration and unknown payload shapes follow the normal delivery path.
- `column_set` is used only for the final panel render because CardKit element
  updates can only rewrite a `content` field.
- The prewarm text is intentionally static (`⏳ 思考中...`); no dot animation and
  no timer.
- The 24-second bounded idle hold is unchanged from the previous release.
