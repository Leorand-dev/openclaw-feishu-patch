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
sha256: a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84   # 2026.11.1
sha256: 2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864   # 2026.11.2
```

Restart the OpenClaw gateway using the host's normal supervisor (for example
`systemctl --user restart openclaw-gateway.service`). Unknown builds are
refused. A host that still carries an older patched bundle is upgraded in place:
the installer finds the pristine copy in `.monitor.backup-*.mjs` (matched by
hash), patches that copy and replaces the target atomically. `patches/HISTORY.json`
lists the recognised previous patched builds; `tools/finalize.py` keeps it and
the installer's `KNOWN_PATCHED` block in sync.

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

Expected: `5/5 suites passed` with 164 assertions. On a pristine 11.1/11.2
target, `--check` reports `status=pristine`; after installation it reports
`status=patched`.

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
python3 tools/check_docs.py
```

## Card layout contract

```
① markdown #content      reasoning phase: 💭 thinking blockquote
                          answer phase: answer only (blockquote cleared)
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
- Reasoning (`isReasoning`) and commentary (`isCommentary`) reply payloads are
  refused by the delivery hook even if a channel enables those core lanes: a
  reasoning payload only feeds the `💭` preview, a commentary payload only
  writes the grey `💬` line. Neither may reach `#content`.
- The `💭 **Thinking**` blockquote in `#content` only covers the reasoning phase:
  it is rendered while the model reasons and is replaced by the answer as soon
  as real answer text arrives (`buildContentText`), so a live card never shows
  reasoning above the answer. A non-extending snapshot is written through the
  element replace endpoint and skips the throttle. If the turn produced no
  answer at all (aborted / held close) the thinking blockquote is kept so the
  card is never blank.

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
- If installation fails the target is left untouched (the patch is applied to a
  temp copy and only `mv`-ed into place after the post-patch hash matches); a
  backup of the previous file stays next to the target. Report the error; do not
  retry with fuzzy patching.
- A new deployment is only verified after one real Feishu tool turn: single
  card, `⏳ 思考中...` prewarm line, grey progress line, expandable
  `🧾 过程记录` with summary + groups, final `✅ 完成`, no residual loading.
- Plugin upgrades reinstall `dist/` and delete `.monitor.backup-*.mjs`. Re-apply
  the patch after every upgrade. Backups rotate automatically (newest 3, and the
  newest pristine copy is never pruned), so keep an out-of-tree copy of the
  pristine bundle if you need a permanent rollback target.
- A stale `.monitor-install.lock` is reclaimed automatically when its pid is gone
  or it is older than 15 minutes; do not delete a lock that belongs to a running
  install.
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
| patched SHA-256 | `a5664b511b5004199dba5cbe777c12d7c39fc4c7a70e585fd81236646ecf7a84` | `2472f7a1637391eeb07ba133c61d4acd190031ccf4c82a42551534216ded2864` |
| patch SHA-256 | `485950c853b37ede8fa02da5a53a8be064f119a212ff4e6294a11b9d1006c1dd` | `de564abef3ba8d746f33b39db41b6b22e1b38931f02a0dc6ca9445395a6a9348` |
| patch hunks | 32 | 32 |
| test assertions | 164 | 164 |

See `README.md` for behavior and limitations.
