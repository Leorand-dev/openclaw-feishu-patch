# Verification — openclaw-feishu-patch

Current supported build: **`@openclaw/feishu@2026.10.9`**.

Upstream note: the 2026.10.9 `dist/.setup/monitor.account-*.mjs` is byte-identical
to 2026.10.8. The patch was re-verified against the 2026.10.9 npm tarball, so the
repository ships only the 2026.10.9 patch.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.9/feishu-tool-aggregation.patch` | `c00af363bf35c6384f26eef029e5ff70f54982d94f49e295a401a9bc4fc85686` |
| `patches/2026.10.9/feishu-tool-aggregation-batch1-to-batch4.patch` | `030899820edd4294a0bad9c2cd439af199dc294037e811c5323e9bdda1501063` |
| `patches/2026.10.9/feishu-tool-aggregation-batch2-to-batch4.patch` | `6c0b9a58335f3fe845dff22ac0d91c211cc1399ef3371351449adf484b7d6f31` |
| `patches/2026.10.9/feishu-tool-aggregation-batch3-to-batch4.patch` | `2a0489b9a38b4f9d0098858d0a236aa48a8cbb0231be94be0d5c6d13da737195` |
| pristine bundle, 2026.10.9 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.9 | `6b183987c2d954c99693ce3b94a7a47e05e8bac87a7fa94a8aaca7a6b9aab1e9` |
| upgradable source, batch 1 | `9cd54d3261639e2e40a401dcf6480acd555a8c458b29b696836b0f85a3f54496` |
| upgradable source, batch 2 | `c70fc9c5739de593fa91b1aead322bee55d8d0e7ef7c48415e2ae5b1b822b7d1` |
| upgradable source, batch 3 | `e49cb6dab0d7c2b408f86304e7d93ce18b6ad542cc1d44a73fe4aa9f5359c6b0` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Patch shape

- **34 hunks**, unified diff against `original.mjs`.
- Forward apply: `ec9d77bf…` -> `6b183987…` (byte-exact).
- Reverse apply: `6b183987…` -> `ec9d77bf…` (byte-exact).
- Batch-1 upgrade delta: `9cd54d32…` -> `6b183987…` (14 hunks, byte-exact).
- Batch-2 upgrade delta: `c70fc9c5…` -> `6b183987…` (2 hunks, byte-exact).
- Batch-3 upgrade delta: `e49cb6da…` -> `6b183987…` (1 hunk, byte-exact).
- Anchor adapter: all 34 hunks relocated by exact old-block match with
  `offset=+0`; no fuzz, no line-number drift.

## Test results (2026.10.9 patched bundle)

`tests/run-all.mjs` -> **13/13 suites, 0 failed, 578 assertions**:

| suite | assertions |
| --- | --- |
| parser/delivery | 111 |
| waiting-line/aggregation | 26 |
| block-fold/status-line | 26 |
| execution harness | 33 |
| idle/timer/content | 35 |
| narration ticker (merged status row) | 36 |
| display/backfill/session | 53 |
| structural audit | 123 |
| 2026.10.8 streamed-text boundary / action card | 21 |
| error sanitizer / duplicate summary / error totals | 16 |
| layout: merged status / icons / panel stats / pagination | 50 |
| reliability batch 2 (status retry / write ack) | 41 |
| batch 4 close/status regression | 7 |
| **total** | **578** |

## Release checks

- `tools/finalize.py` -> 1 build, current 2026.10.9; manifest, installer
  `VERSIONS`/`UPGRADES` blocks and `patches/SHA256SUMS` agree.
- `tools/verify_patch.py --all=patches` -> forward/reverse byte-exact.
- `node --check` on the patched bundle -> pass.
- `tools/check_docs.py` -> release checks OK (1 supported version, 3 upgrades, 3 docs).
- Root `SHA256SUMS` covers installer, manifest, upgrades and all four patch files;
  `sha256sum -c SHA256SUMS` passes at the repository root.
- Installer tested on pristine, batch-1, batch-2 and batch-3 copies: `--check`,
  `--dry-run`, apply and idempotency all pass; every path produces
  `6b183987…`.
- Upgrade deltas were applied independently with GNU `patch` on copies of the
  batch-1, batch-2 and batch-3 bundles; all produced the same `6b183987…` hash.
- The batch-3 -> batch-4 delta was also applied by `install.sh` on macOS with
  BSD `patch`; the result was `6b183987…` and the second `--check` reported
  `status=patched`.

## Deployment evidence

Batch 4 (`6b183987…`) was deployed to all seven monitored hosts on 2026-11-01.
Host A was the canary at 20:45:29 CST; the remaining Linux hosts followed at
20:47:40–20:49:08 CST, and the macOS host at 20:49:41 CST. Every replacement was
backed up next to the target as `.monitor.backup-batch4-<UTC timestamp>.mjs`.

| host | platform | bundle after deploy | health | service | backup |
| --- | --- | --- | --- | --- | --- |
| A (canary) | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T204529Z.mjs` |
| B | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T204740Z.mjs` |
| C | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T124800Z.mjs` |
| D | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T124825Z.mjs` |
| E | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T204845Z.mjs` |
| F | Linux | `6b183987…` | 200 | active | `.monitor.backup-batch4-20261101T204908Z.mjs` |
| G | macOS | `6b183987…` | 200 | launchd pid 56646 | `.monitor.backup-batch4-20261101T204941Z.mjs` |

The six Linux hosts ran the full suite from the deployed bundle:
**13/13 suites, 578 assertions, 0 failed** on each. The macOS host has no
standalone Node runtime for the suite; its deployed bundle hash and `/health`
were verified directly, and the batch-3 -> batch-4 installer delta was
validated separately with BSD `patch` and `install.sh`.

The prior batch-3 canary had one real Feishu turn on host A at 19:25:45–19:25:50
CST: the card opened and closed, the journal showed the initial
`Card status element update OK`, and there was no `Status update failed` or
card-finalization error. Batch 4 changes only the delete-failure fallback; a
live turn after the batch-4 restart has not yet been recorded, so the visible
status row remains a user-side visual check.

## Behavior covered by this patch

- Empty/tool-only turns keep a readable chat preview (`✅ 完成 · N 工具 · Xs`).
- The process panel keeps a static header and writes its body in place, so an
  expanded panel stays expanded; the body opens with a grey breakdown instead of
  overlapping event/tool totals.
- Block updates merge cumulative text; a shorter delta never replaces longer
  accumulated prose.
- Narration merged into the grey status row strips `<`/`>`.
- The transient tool-error notice is cleared when the assistant starts.
- Update budgets use a rolling 60s window (120 status / 180 details), so long
  tool runs are not frozen.
- Status-element writes retry transient failures (HTTP 408/429/5xx, network,
  Feishu backoff codes) at most three times with exponential backoff; permanent
  validation/permission errors fall back immediately.
- Content/status/detail caches advance only after a confirmed write; failures
  restore the last acknowledged value and trigger at most three bounded
  coalesced retries instead of being treated as delivered.
- **Batch 3:** the final grey completion status is written with an explicit
  `allowClosed` path after `closeWithResult()` marks the session closed. A failed
  final summary write clears the status element instead of leaving the old
  `✍️ 生成回复中` text visible.
- **Batch 4:** if the delete-status-element path itself fails during close, its
  zero-width fallback also uses `allowClosed`, so the old status cannot survive
  a failed delete.
