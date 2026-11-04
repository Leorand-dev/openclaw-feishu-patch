# Verification — openclaw-feishu-patch 2026.10.10

Current supported build: **`@openclaw/feishu@2026.10.10`**.

This is a new content-only baseline. The 2026.10.9 status-element patch is not
applicable to 10.10; no upgrade delta is shipped.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.10/feishu-tool-aggregation.patch` | `ccc642a26c8f46ecc3f53b852bcb4510839a838f207f891f87dddca35f0c47da` |
| pristine bundle, 2026.10.10 | `a0ff2719d3470d6327897ea7d6c91bec8354a2ef4de36db53d0185096b3bfbe7` |
| patched bundle, 2026.10.10 | `3036ef6917d19b58ca678e15beb76e3d30d4fcd349947154844be39d00e10095` |

The bundle files are not redistributed in the public release; hashes are
reference values for the exact supported build.

## Patch shape

- **19 hunks**, unified diff against `original.mjs`.
- Forward apply: `a0ff2719…` -> `3036ef69…` (byte-exact).
- Reverse apply: `3036ef69…` -> `a0ff2719…` (byte-exact).
- No CRLF, no `\ No newline` markers, no malformed hunks.
- No legacy status-element symbols: `writeStatusContent`, `deleteStatusElement`,
  `statusElementEnabled`, `updateStatus` are absent.

## Test results

`tests/run-all.mjs` -> **5/5 suites, 0 failed, 68 assertions**:

| suite | assertions |
| --- | --- |
| parser/content-only helpers | 21 |
| aggregation/status/details | 10 |
| finalization/reliability | 19 |
| streaming-session shape | 12 |
| idle-hold behavior | 6 |
| **total** | **68** |

Additional checks performed locally:

- `node --check` on the patched bundle -> pass.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact, 19/19
  hunks apply at the expected offsets.
- `install.sh --check` on pristine -> `status=pristine`.
- `install.sh --dry-run` -> `would patch`, target unchanged.
- `install.sh` on a temporary pristine copy -> patched SHA
  `3036ef6917d19b58ca678e15beb76e3d30d4fcd349947154844be39d00e10095`;
  backup created; second `--check` -> `status=patched`; second install ->
  `already patched`.
- Tests run against the installed temporary copy -> 68/68 assertions pass.

## Release checks

- `tools/finalize.py` -> 1 build, current `2026.10.10`; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- Root `SHA256SUMS` covers installer, manifest, upgrades and the patch.
- Installer no-upgrade path is bash 3.2 compatible (`${UPGRADES[@]-}`); exercised
  on macOS 90 (`/bin/bash 3.2.57`) and on Linux.
- `tools/check_docs.py` -> release checks OK.
- Public-tree hygiene: no hostnames, private IPs, absolute paths or credentials.

## Known limits

- A canary deployment passed one real Feishu tool turn on 2026-11-04 (single
  card, expandable details panel, final `✅ 完成`, no residual loading). More
  hosts were installed and health-checked, but not individually live-tested.
- The `✅ 完成` line applies to the streaming card. A non-streaming static
  fallback card is unchanged.
- Only recognized tool-summary payloads are aggregated; errors, media,
  narration and unknown payload shapes follow the normal delivery path.
- The details panel is created with the card and updated in place; it is not a
  separate status element.
