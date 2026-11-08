# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It folds tool progress into one streaming card: a grey progress line (starting
with `⏳ 思考中...` as soon as the card exists), a collapsed `🧾 过程记录` panel
that lists which tools ran and what they touched, and a single final `✅ 完成`
line. Tool names and targets come from the structured `onToolStart` callback
(the reviewed text shapes remain a fallback), and model commentary is shown on
the progress line instead of leaking into the answer.

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
| patched bundle | `b7ae62a883a10d15ce5e67fdf10ec30bcee277ad6e7b38a97ca7292112bb03be` |
| patch | `1f67ad1ed00bd7d8a004cf8186928881035886d608f9dc0c3d86eaa3fef4ef49` |
| patch hunks | 29 |
| test assertions | 129 |

The installer accepts only the pristine 2026.11.1 bundle, the already patched
bundle, or an unknown build which it refuses. There is no upgrade delta; apply
it to a pristine 11.1 install. Hosts still on 2026.10.10 must upgrade the plugin
first.

## Card layout (layout v3 + prewarm)

```
[header]                          optional title + template
  ① markdown #content             reasoning blockquote ─── answer only
  ② markdown #progress            grey status / commentary / completion line
  ③ hr #divider                   separates answer from the process panel
  ④ collapsible_panel             collapsed 「🧾 过程记录」
       markdown #detailspanel_body   summary + compact category groups
  ⑤ hr + markdown #note           optional grey identity footer
```

Prewarm: 2026.11.1 already creates the card in `onReplyStart`, but leaves it
empty until the first token. The patch writes `⏳ 思考中...` into `#progress` as
soon as the card is ready, and clears it (zero-width space) when the first
token, reasoning chunk or tool event arrives. The text is static — no animation,
no extra API calls beyond that one write.

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
node run-all.mjs ../patches/2026.11.1/patched.mjs
```

Expected: `5/5 suites passed, 0 failed` with 129 assertions.

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
