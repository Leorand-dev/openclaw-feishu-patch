# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It folds tool progress into one streaming card: a compact running summary while
tools execute, a collapsed `🧾 过程记录` panel with grouped tool rows, and a
single final `✅ 完成` line. The main answer stays in the card's content element;
there is no separate status element.

- **Supported plugin build:** `@openclaw/feishu` **2026.10.10**
- **Patch type:** unified diff against the installed
  `dist/.setup/monitor.account-*.mjs`
- **Install:** exact SHA-256 check; backup; atomic replace; idempotent
- **No credentials required by this repository**

> This repository ships the patch, installer and tests. It does not redistribute
> the upstream plugin bundle.

## Supported build

| item | value |
| --- | --- |
| OpenClaw Feishu plugin | `@openclaw/feishu@2026.10.10` |
| pristine bundle | `a0ff2719d3470d6327897ea7d6c91bec8354a2ef4de36db53d0185096b3bfbe7` |
| patched bundle | `3036ef6917d19b58ca678e15beb76e3d30d4fcd349947154844be39d00e10095` |
| patch | `ccc642a26c8f46ecc3f53b852bcb4510839a838f207f891f87dddca35f0c47da` |
| patch hunks | 19 |
| test assertions | 68 |

The installer accepts only the pristine 2026.10.10 bundle, the already patched
bundle, or an unknown build which it refuses. There is no upgradable batch
delta for 2026.10.10; apply it to a pristine 10.10 install.

## What it does

- Aggregates recognized tool payloads (`Exec`, `Read: ...`, `Web Fetch: ...`,
  emoji-prefixed tool summaries) into a running total.
- Shows a single status line inside the card content:
  - `⏳ 已执行 N 个工具 · 最近：终端 · 12s` while tools run
  - `✅ 已执行 N 个工具 · 生成回复中…` when the answer starts
  - `✅ 完成 · 已执行 N 个工具 · 2m03s` on final close
- Writes grouped tool rows into a collapsed `🧾 过程记录` panel:
  `- 💻 终端 ×2`, `- 📖 读取`, etc.
- Uses the 2026.10.10 content-only CardKit streaming model. The legacy
  `status` element, `writeStatusContent`, `updateStatus` and `deleteStatusElement`
  paths are intentionally not present.
- Keeps the native `closeWithResult()` / `discard()` finalization paths.
- Defers a core idle close for up to 24 seconds (three 8-second windows) while a
  tool turn has no answer text, so normal tool batches and the final reply stay
  on one card. If the bound is reached, it closes with a neutral `处理中` line
  instead of a false `完成` and keeps tool counters for the next card.
- Retries transient main-content, details-panel and close-settings writes (HTTP
  408/429/5xx and Feishu backoff codes) with bounded backoff; permanently
  rejected writes fail without retry.
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
node run-all.mjs ../patches/2026.10.10/patched.mjs
```

Expected: `5/5 suites passed, 0 failed` with 68 assertions.

Mechanical checks:

```sh
python3 tools/check_docs.py
python3 tools/verify_patch.py --all=patches
```

## Patch architecture

- `patches/2026.10.10/original.mjs` — reviewed pristine 10.10 monitor bundle.
- `patches/2026.10.10/patched.mjs` — reviewed patched bundle.
- `patches/2026.10.10/feishu-tool-aggregation.patch` — canonical unified diff.
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

- The patch is pinned to the exact 10.10 monitor bundle. Do not apply it to a
  different version; the installer refuses unknown hashes.
- `✅ 完成` is added to the streaming card's final content. If the turn falls
  back to a non-streaming static send, that static card is unchanged.
- Tool aggregation only applies to payloads that match the reviewed tool-summary
  shapes; errors, media payloads, narration and unknown shapes follow the normal
  delivery path.
- The process panel is rendered at card creation and updated in place. It is
  intentionally not a status element.
- A canary deployment passed one real Feishu tool turn on 2026-11-04 (single
  card, expandable details panel, final `✅ 完成`, no residual loading). Run a
  live turn after deploying to a new host before declaring it verified.

## Rollback

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```
