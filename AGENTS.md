# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install/verify/rollback the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.10.5`**.
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
sha256: 2b3af8e44abc4bd580ccdf27a77ba2e85e53c2a46051fedfa6d5c01ba9270c68
```

Then restart the OpenClaw gateway using the host's normal supervisor
(for example `systemctl --user restart openclaw-gateway.service`).

## Verify

```sh
sha256sum -c SHA256SUMS
cd tests && node run-all.mjs "$TARGET"
```

Expected: `8/8 suites passed`, `353` assertions.

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
| plugin build | 2026.10.5 |
| pristine SHA-256 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched SHA-256 | `2b3af8e44abc4bd580ccdf27a77ba2e85e53c2a46051fedfa6d5c01ba9270c68` |
| patch SHA-256 | `ae10e953e2d8e5b41d7e5089d3fae27a13a265a83e95e867cddcc8b2845fc046` |

See `README.md` for behavior, limitations and adapter workflow.
