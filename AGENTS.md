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
sha256: 53f7c53f95ff2da90a91e9fcc98ae10bf474c94ae55ad4d748e510cac6cc2725   # 2026.11.1
sha256: ee93e269edf1717c2ae541bf1d343813c69055f5cd31f0c0d370e849f9e2194d   # 2026.11.2
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

Expected: `5/5 suites passed` with 146 assertions. On a pristine 11.1/11.2
target, `--check` reports `status=pristine`; after installation it reports
`status=patched`.

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
python3 tools/check_docs.py
```

## Card layout contract

```
① markdown #content      live: 💭 thinking blockquote + answer
                          closed: answer only (thinking cleared)
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
- The `💭 **Thinking**` blockquote in `#content` is a live-only preview: while
  the turn streams it sits above the answer, and at close the content element is
  replaced with the answer only. If the turn produced no answer at all
  (aborted / held close) the thinking blockquote is kept so the card is never
  blank.

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
- A card's streaming window ends 10 minutes after the card is created: the first
  late write returns `200850` (`card streaming timeout`) and later ones `300309`
  (`streaming mode is closed`). Both are terminal by design — the session stops
  writing, the frozen card is deleted at close and the answer is delivered as a
  normal message. Do not add retry logic for these two codes; doing so burns the
  app's API quota for no visible result.

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
| patched SHA-256 | `53f7c53f95ff2da90a91e9fcc98ae10bf474c94ae55ad4d748e510cac6cc2725` | `ee93e269edf1717c2ae541bf1d343813c69055f5cd31f0c0d370e849f9e2194d` |
| patch SHA-256 | `4801517ad9df24be63ca4ba1c8852b2093054961f3b8c1dca9d9313839e24a51` | `118492e63f3b9613cf51d80acd2952964793712019486bdd82bbe37aee97aa80` |
| patch hunks | 31 | 31 |
| test assertions | 146 | 146 |

See `README.md` for behavior and limitations.
