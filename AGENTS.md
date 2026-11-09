# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install, verify or roll back the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.11.1`** or
  **`@openclaw/feishu@2026.11.2`**.
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
sha256: b7ae62a883a10d15ce5e67fdf10ec30bcee277ad6e7b38a97ca7292112bb03be   # 2026.11.1
sha256: 9ea34a8dbb30de75a3b3c1a39d12785c583be68010d56edba27dbf258952a63d   # 2026.11.2
```

Restart the OpenClaw gateway using the host's normal supervisor (for example
`systemctl --user restart openclaw-gateway.service`). Unknown builds are
refused; there is no upgrade delta in this release.

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

Expected: `5/5 suites passed` with 129 assertions. On a pristine 11.1/11.2
target, `--check` reports `status=pristine`; after installation it reports
`status=patched`.

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
python3 tools/check_docs.py
```

## Card layout contract

```
① markdown #content      reasoning blockquote + answer only (no status line)
② markdown #progress     grey status / commentary / completion line
③ hr #divider            separator
④ collapsible_panel      「🧾 过程记录」, body #detailspanel_body
                          live/final: markdown summary + compact groups
                          close: panel + divider deleted (no tools)
⑤ hr + markdown #note    optional grey identity footer
```

- Tool rows prefer the structured `onToolStart` name/args pair; single-tool
  groups carry the tool name in the title, multi-tool groups prefix rows with
  the tool icon. Commands keep their head, paths keep their tail, credential
  substrings are redacted.
- Assistant commentary is written to `#progress` as `💬 …`, never into
  `#content`.

- Prewarm: write the static `⏳ 思考中...` into `#progress` once the card is
  ready, and clear it (zero-width space) on the first token, reasoning chunk or
  tool event. No animation, no timer.
- Live panel updates must stay `PUT .../elements/detailspanel_body/content`;
  the final render replaces the same element with the final markdown body.
- Empty tool turns must not leave a visible panel.
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
- If installation fails, the installer restores the backup automatically.
  Report the error; do not retry with fuzzy patching.
- A new deployment is only verified after one real Feishu tool turn: single
  card, `⏳ 思考中...` prewarm line, grey progress line, expandable
  `🧾 过程记录` with summary + groups, final `✅ 完成`, no residual loading.
- Plugin upgrades reinstall `dist/` and delete `.monitor.backup-*.mjs`. Re-apply
  the patch after every upgrade and keep an out-of-tree copy of the pristine
  bundle if you need a rollback target.

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```

## Current build reference

| item | 2026.11.1 | 2026.11.2 |
| --- | --- | --- |
| plugin build | `2026.11.1` | `2026.11.2` |
| pristine SHA-256 | `6dbfa74bcad154b68d206f7d54883b8679a3b308332954a29f2d0f91af7bddb7` | `44f6d50f1fe6dbfa9cfb12aef47e954589391929721d985deb2ecf976de4aab6` |
| patched SHA-256 | `b7ae62a883a10d15ce5e67fdf10ec30bcee277ad6e7b38a97ca7292112bb03be` | `9ea34a8dbb30de75a3b3c1a39d12785c583be68010d56edba27dbf258952a63d` |
| patch SHA-256 | `1f67ad1ed00bd7d8a004cf8186928881035886d608f9dc0c3d86eaa3fef4ef49` | `530ccc57517e1b6902ecaa0ddd4b6b66fff8fe9677cbd12af975176f7012b750` |
| patch hunks | 29 | 30 |
| test assertions | 129 | 129 |

See `README.md` for behavior and limitations.
