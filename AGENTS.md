# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install/verify/rollback the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.10.9`**.
- The target file is the installed monitor bundle:

  ```
  ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs
  ```

- Required tools: `bash`, `patch`, `sha256sum` (or `shasum`).
- No credentials or network access to Feishu are needed for installation.

## Install

```sh
git clone https://github.com/Leorand-dev/openclaw-feishu-patch.git
cd openclaw-feishu-patch

TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh "$TARGET"
```

Expected installer output:

```
sha256: 9cd54d3261639e2e40a401dcf6480acd555a8c458b29b696836b0f85a3f54496
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

Expected: `11/11 suites passed` (530 assertions).

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
```

## Guardrails

- **Do not** apply this patch to a different plugin build. The installer will
  refuse an unknown pristine hash; report the actual target hash and stop.
- The 2026.10.9 monitor bundle is byte-identical to 2026.10.8 in upstream;
  only the 2026.10.9 patch directory ships. Do not recreate older version
  directories.
- **Do not** set new Feishu config keys such as `cardStatusPosition` or
  `reasoningMaxLines`: OpenClaw's plugin schema rejects unknown keys and marks
  the config invalid. Behavior defaults are compiled into the patch.
- **Do not** paste credentials, tokens, hostnames, or chat contents into this
  repository.
- **Do not** restart the gateway mid-turn. During restart recovery, tool/narration
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
| plugin build | 2026.10.9 |
| pristine SHA-256 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched SHA-256 | `9cd54d3261639e2e40a401dcf6480acd555a8c458b29b696836b0f85a3f54496` |
| patch SHA-256 | `b8ee0366f0191443b89c4d58beb3d8e2498daf760cb7fc07cefbd355fd8e148c` |

See `README.md` for behavior, limitations and adapter workflow.
