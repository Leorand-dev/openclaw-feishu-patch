# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install/verify/rollback the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.10.5`, `2026.10.6`, `2026.10.7`, or `2026.10.8`**.
- The target file is the installed monitor bundle:

  ```
  ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs
  ```

- Required tools: `bash`, `patch`, `sha256sum`.
- No credentials or network access to Feishu are needed for installation.

## Install

```sh
git clone https://github.com/Leorand-dev/openclaw-feishu-patch.git
cd openclaw-feishu-patch

TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh "$TARGET"
```

Expected installer output includes one of:

```
sha256: 25bf3802fbf87768c27132952d83c238063f5612c550b1ebb64eee66306db23c   # 2026.10.5-10.7
sha256: 178d201de988bd6cb183dea5ae15e30702c2c34c222f585cd1f17738f5d531bd   # 2026.10.8
```

Then restart the OpenClaw gateway using the host's normal supervisor
(for example `systemctl --user restart openclaw-gateway.service`).

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

Expected: `11/11 suites passed` (500 assertions on 2026.10.5–10.7, 508 on 2026.10.8).

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
```

## Guardrails

- **Do not** apply this patch to a different plugin build. The installer will
  refuse an unknown pristine hash; report the actual target hash and stop.
- **Do not** set new Feishu config keys such as `cardStatusPosition` or
  `reasoningMaxLines`: OpenClaw's plugin schema rejects unknown keys and marks
  the config invalid. Behavior defaults are compiled into the patch.
- **Do not** paste credentials, tokens, hostnames, or chat contents into this
  repository.
- **Do not restart the gateway mid-turn.** During restart recovery, tool/narration
  progress may appear as temporary standalone posts because no streaming card
  exists yet. This is expected recovery behavior, not a patch failure; the next
  turn after the gateway is healthy returns to the single-card flow.
- If installation fails, the installer restores the backup automatically.
  Report the error; do not retry with fuzzy patching.

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```

## Current build reference

| item | value |
| --- | --- |
| plugin build | 2026.10.5 / 2026.10.6 / 2026.10.7 / 2026.10.8 |
| pristine SHA-256, 2026.10.5–10.7 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched SHA-256, 2026.10.5–10.7 | `25bf3802fbf87768c27132952d83c238063f5612c550b1ebb64eee66306db23c` |
| patch SHA-256, 2026.10.5–10.7 | `f3ed1a22375fd74da571ed5a3d005c94ed6116683c1f01192e63e8772c76e988` |
| pristine SHA-256, 2026.10.8 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched SHA-256, 2026.10.8 | `178d201de988bd6cb183dea5ae15e30702c2c34c222f585cd1f17738f5d531bd` |
| patch SHA-256, 2026.10.8 | `a0fcd7066417e49dbfb38aad1b1fb7163a9f5a5cde164c1479fd3f3261a28435` |

See `README.md` for behavior, limitations and adapter workflow.
