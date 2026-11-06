# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It folds tool progress into one streaming card: a grey progress line (starting
with `⏳ 思考中...` as soon as the card exists), a collapsed `🧾 过程记录` panel
with a summary line and category groups, and a single final `✅ 完成` line. The
answer stays in the card's content element; progress and completion live in a
dedicated progress element, so the answer is never rewritten just to update the
status.

- **Supported plugin build:** `@openclaw/feishu` **2026.11.1**
- **Patch type:** unified diff against the installed
  `dist/.setup/monitor.account-*.mjs`
- **Install:** exact SHA-256 check; backup; atomic replace; idempotent
- **No credentials required by this repository**

> This repository ships the patch, installer and tests. It does not redistribute
> the upstream plugin bundle.

## Supported build

| item | value |
| --- | --- |
| OpenClaw Feishu plugin | `@openclaw/feishu@2026.11.1` |
| pristine bundle | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` |
| patched bundle | `2ef9423eba4810cf2c7a5e5e8d7d523c8127bbfe33c2190ef6875a979135f867` |
| patch | `76c2ca26b0635b05afd114c5e404c3251785104fd68d96b1c62b9867f583f7de` |
| patch hunks | 20 |
| test assertions | 99 |

The installer accepts only the pristine 2026.11.1 bundle, the already patched
bundle, or an unknown build which it refuses. There is no upgrade delta; apply
it to a pristine 11.1 install. Hosts still on 2026.10.10 must upgrade the plugin
first.

## Card layout (layout v2 + prewarm)

```
[header]                          optional title + template
  ① markdown #content             reasoning blockquote ─── answer
  ② markdown #progress            grey status / completion line
  ③ hr #divider                   separates answer from the process panel
  ④ collapsible_panel             collapsed 「🧾 过程记录」
       markdown #detailspanel_body   summary + category groups (live)
                                     → replaced with column_set at close
  ⑤ hr + markdown #note           optional grey identity footer
```

Prewarm: 2026.11.1 already creates the card in `onReplyStart`, but leaves it
empty until the first token. The patch writes `⏳ 思考中...` into `#progress` as
soon as the card is ready, and clears it (zero-width space) when the first
token, reasoning chunk or tool event arrives. The text is static — no animation,
no extra API calls beyond that one write.

At close, when the turn used tools the panel body is replaced once with a
`column_set`: left column = grouped tool list, right column = statistics
(total tools, duration, per-category counts). When the turn used no tools, the
panel and the divider are deleted so a plain Q&A card has no empty panel.

## What it does

- Aggregates recognized tool payloads (`Exec`, `Read: ...`, `Web Fetch: ...`,
  emoji-prefixed tool summaries) into a running total.
- Writes the live status into the dedicated `#progress` element as grey text:
  - `⏳ 思考中...` between reply start and the first output
  - `⏳ N 个工具 · 12s` while tools run
  - `✅ N 个工具 · 生成回复中…` when the answer starts
  - `⏳ N 个工具 · 处理中…` if the bounded idle hold expires
  - `✅ 完成 · 已执行 N 个工具 · 2m03s` on final close
- Writes the collapsed `🧾 过程记录` panel as a summary line plus category
  groups (`命令` / `文件` / `网络` / `会话` / `其他`), e.g.
  `**共 12 个工具 · 45s**`, `**命令**`, `- 💻 终端 ×2`.
- Uses the CardKit 2.0 element APIs only: `PUT .../elements/{id}/content`
  (streaming text), `PUT .../elements/{id}` (replace with `column_set`),
  `DELETE .../elements/{id}` (drop the empty panel). The legacy `status`
  element, `writeStatusContent`, `updateStatus` and `deleteStatusElement` paths
  are intentionally not present.
- Keeps the native `closeWithResult()` / `discard()` finalization paths.
- Defers a core idle close for up to 24 seconds (three 8-second windows) while a
  tool turn has no answer text, so normal tool batches and the final reply stay
  on one card. If the bound is reached, it closes with a neutral `处理中` line
  instead of a false `完成` and keeps tool counters for the next card.
- Retries transient content, element and close-settings writes (HTTP 408/429/5xx
  and Feishu backoff codes) with bounded backoff; permanently rejected writes
  fail without retry.
- Fails open: if the progress element write fails the completion line is folded
  back into the content; if the `column_set` replace fails the grouped markdown
  list is kept; if the empty-panel delete fails the panel simply stays.
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
node run-all.mjs ../patches/2026.11.1/patched.mjs
```

Expected: `5/5 suites passed, 0 failed` with 99 assertions.

Mechanical checks:

```sh
python3 tools/check_docs.py
python3 tools/verify_patch.py --all=patches
```

## Patch architecture

- `patches/2026.11.1/original.mjs` — reviewed pristine 11.1 monitor bundle.
- `patches/2026.11.1/patched.mjs` — reviewed patched bundle.
- `patches/2026.11.1/feishu-tool-aggregation.patch` — canonical unified diff.
- `patches/MANIFEST.json` / `patches/UPGRADES.json` — build metadata.
- `patches/SHA256SUMS` — bundle and patch checksums for the internal tree.
- `tools/finalize.py` — regenerates the patch, manifest, installer block and
  `patches/SHA256SUMS` from the reviewed bundle pair.
- `tools/verify_patch.py` — forward/reverse byte-exact verification.
- `tools/adapt_patch.py` — anchor adapter for re-deriving the patch against a
  different minor build (review the result manually).

The public release may omit `original.mjs` and `patched.mjs`; the patch and
installer remain usable without them. The internal tree keeps both bundles so
the patch can be regenerated.

## Notes and known limits

- The patch is pinned to the exact 11.1 monitor bundle. Do not apply it to a
  different version; the installer refuses unknown hashes.
- 2026.11.1 removed `mergeStreamingText()` and `lastSnapshotTextLength`, and
  `onAssistantMessageStart` now resets `snapshotBaseText` / `lastPartial`. The
  patch keeps that upstream behaviour and layers the tool state machine on top;
  the four hunks that touch those areas are re-anchored for 11.1.
- `✅ 完成` is written to the progress element. If the turn falls back to a
  non-streaming static send, that static card is unchanged.
- Tool aggregation only applies to payloads that match the reviewed tool-summary
  shapes; errors, media payloads, narration and unknown shapes follow the normal
  delivery path.
- `column_set` is used only for the final panel render. The live panel stays a
  markdown element because CardKit element updates can only rewrite a `content`
  field.
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
