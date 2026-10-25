# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install/verify/rollback the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.10.5` or `@openclaw/feishu@2026.10.6`**.
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

Expected installer output includes:

```
patched OK: ...
sha256: e135a8c703f9a2f50aa8fedd353d8219f4b5ab5dd695037bbd367adf08038e9f
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

Expected: `8/8 suites passed`, `424` assertions.

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
| plugin build | 2026.10.5 / 2026.10.6 |
| pristine SHA-256 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched SHA-256 | `e135a8c703f9a2f50aa8fedd353d8219f4b5ab5dd695037bbd367adf08038e9f` |
| patch SHA-256 | `49549b2274d4159e8475fa3f88a95e6e7f3bdc5c79a3ef1e4ab36b4b9448c21f` |

See `README.md` for behavior, limitations and adapter workflow.
