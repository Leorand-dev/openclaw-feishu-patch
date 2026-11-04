# Agent instructions — openclaw-feishu-patch

This repository installs a build-pinned patch for the OpenClaw Feishu channel
plugin. Use these steps when a user asks you to install, verify or roll back the
patch.

## Preconditions

- Target plugin build must be **`@openclaw/feishu@2026.10.10`**.
- The target file is the installed monitor bundle:

  ```
  ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs
  ```

- Required tools: `bash`, `patch`, `sha256sum` (or `shasum`).
- No credentials or network access to Feishu are needed for installation.
- The 2026.10.10 patch is content-only: it does not use the legacy `status`
  element or `writeStatusContent`/`updateStatus` paths.

## Install

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh --check "$TARGET"
./install.sh "$TARGET"
```

Expected installer output:

```
sha256: 3036ef6917d19b58ca678e15beb76e3d30d4fcd349947154844be39d00e10095
```

Restart the OpenClaw gateway using the host's normal supervisor (for example
`systemctl --user restart openclaw-gateway.service`). Unknown builds are
refused; there is no 10.10 upgrade delta in this release.

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

Expected: `5/5 suites passed` with 68 assertions. On a pristine 10.10 target,
`--check` reports `status=pristine`; after installation it reports
`status=patched`.

Optional mechanical check:

```sh
python3 tools/verify_patch.py --all=patches
python3 tools/check_docs.py
```

## Guardrails

- **Do not** apply this patch to a different plugin build. The installer will
  refuse an unknown pristine hash; report the actual target hash and stop.
- Do not add a 2026.10.9 patch directory to this release. 10.10 is a new
  content-only baseline; the old status-element patch is not applicable.
- **Do not** set new Feishu config keys. Behavior is compiled into the patch.
- **Do not** paste credentials, tokens, hostnames, or chat contents into this
  repository.
- **Do not** restart the gateway mid-turn. Restart recovery may produce temporary
  standalone progress posts because no streaming card exists yet; the next turn
  after the gateway is healthy returns to the single-card flow.
- If installation fails, the installer restores the backup automatically.
  Report the error; do not retry with fuzzy patching.
- A canary deployment passed one real Feishu tool turn on 2026-11-04. For any
  new deployment, watch the first live turn (single card, expandable details
  panel, final `✅ 完成`, no residual loading) before declaring it verified.

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```

## Current build reference

| item | value |
| --- | --- |
| plugin build | 2026.10.10 |
| pristine SHA-256 | `a0ff2719d3470d6327897ea7d6c91bec8354a2ef4de36db53d0185096b3bfbe7` |
| patched SHA-256 | `3036ef6917d19b58ca678e15beb76e3d30d4fcd349947154844be39d00e10095` |
| patch SHA-256 | `ccc642a26c8f46ecc3f53b852bcb4510839a838f207f891f87dddca35f0c47da` |
| patch hunks | 19 |

See `README.md` for behavior and limitations.
