# Verification — openclaw-feishu-patch

Current supported build: **`@openclaw/feishu@2026.10.9`**.

Upstream note: the 2026.10.9 `dist/.setup/monitor.account-*.mjs` is
byte-identical to 2026.10.8. The patch was re-verified against the 2026.10.9
npm tarball, so the repository ships only the 2026.10.9 patch.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.9/feishu-tool-aggregation.patch` | `df6a57767197b5dd413a49c0656f75ab453991186fc91cbc23a8291c3c181730` |
| `patches/2026.10.9/feishu-tool-aggregation-batch1-to-batch2.patch` | `3611d0e1cad1325b4b14f1ed6efcbed3851c4787186de13d053e284fe608ad6b` |
| pristine bundle, 2026.10.9 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.9 | `c70fc9c5739de593fa91b1aead322bee55d8d0e7ef7c48415e2ae5b1b822b7d1` |
| upgradable source, batch 1 | `9cd54d3261639e2e40a401dcf6480acd555a8c458b29b696836b0f85a3f54496` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Patch shape

- **34 hunks**, unified diff against `original.mjs`.
- Forward apply: `ec9d77bf…` → `c70fc9c5…` (byte-exact).
- Reverse apply: `c70fc9c5…` → `ec9d77bf…` (byte-exact).
- Batch-1 upgrade delta: `9cd54d32…` → `c70fc9c5…` (13 hunks, byte-exact).
- Anchor adapter: all 34 hunks relocated by exact old-block match with
  `offset=+0`; no fuzz, no line-number drift.

## Test results (2026.10.9 patched bundle)

`tests/run-all.mjs` → **12/12 suites, 0 failed, 571 assertions**:

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
| **total** | **571** |

The same suite was re-run from the deployed bundle on the canary host and five
other Linux hosts: **12/12 suites, 0 failed, 571 assertions** on each, target
SHA-256 `c70fc9c5…`.

## Release checks

- `tools/finalize.py` → 1 build, current 2026.10.9; manifest, installer
  `VERSIONS`/`UPGRADES` blocks and `patches/SHA256SUMS` agree.
- `tools/verify_patch.py --all=patches` → forward/reverse byte-exact; the
  batch-1 → batch-2 delta is verified separately (13 hunks).
- `node --check` on the patched bundle → pass.
- `tools/check_docs.py` → release checks OK (1 supported version, 1 upgrade, 3 docs).
- Installer tested on pristine and batch-1 copies: `--check`, `--dry-run`,
  apply and idempotency all pass; both produce `c70fc9c5…`.
- GitHub Actions `verify-patch` fetches `@openclaw/feishu@2026.10.9` from npm,
  runs the anchor adapter, installer apply/idempotency/reverse-diff and the full
  test suite.

## Deployment evidence

Batch 1 (`9cd54d32…`) was deployed to all seven monitored hosts on 2026-10-30:
one canary host at 13:06 CST, five more Linux hosts at 15:06–15:08 CST, and the
macOS host at 19:31 CST. Each host was upgraded from the previous patched
bundle (`6f229a5a…`); every replacement was backed up as
`.monitor.backup-ui-batch1-<UTC timestamp>.mjs` next to the target. After
restart all seven hosts reported the gateway active and `/health` = `200`, and
the deployed bundle SHA-256 was re-checked as `9cd54d32…` on every host.

Batch 2 (`c70fc9c5…`) was deployed to all seven monitored hosts on
2026-10-30 between 20:17 and 20:32 CST: the canary host first, then five
Linux hosts, then the macOS host. Every replacement was backed up as
`.monitor.backup-batch2-<UTC timestamp>.mjs` next to the target. After restart
all seven hosts reported the gateway active and `/health` = `200`, and the
deployed bundle SHA-256 was re-checked as `c70fc9c5…` on every host. The six
Linux hosts ran the full suite from the deployed bundle: **12/12 suites, 571
assertions**. The macOS host has no standalone Node runtime to run the suite;
its deployed hash and health were verified directly.

No real Feishu turn had occurred in the canary window at the time of this
record, so the retry/acknowledgement paths have unit and host-side suite
coverage but have not yet been exercised by a live provider failure.

## Behavior covered by this patch

- Empty/tool-only turns keep a readable chat preview (`✅ 完成 · N 工具 · Xs`).
- The process panel keeps a static header and writes its body in place, so an
  expanded panel stays expanded; the body opens with a grey breakdown
  (`N 次工具 · N 条旁白 · N 个错误`) instead of overlapping event/tool totals.
- Block updates merge cumulative text; a shorter delta never replaces longer
  accumulated prose.
- Narration merged into the grey status row strips `<`/`>`.
- The transient tool-error notice is cleared when the assistant starts.
- Update budgets use a rolling 60s window (120 status / 180 details), so long
  tool runs are not frozen.
- Schema-rejected config reads (`cardIdleHoldMs`, `cardStatusElement`,
  `progressTexts`, `prewarmCard`) are absent; fixed defaults are compiled in.
- Status-element writes retry transient failures (HTTP 408/429/5xx, network,
  Feishu backoff codes) at most three times with exponential backoff; permanent
  validation/permission errors fall back immediately.
- Content/status/detail caches advance only after a confirmed write; failures
  restore the last acknowledged value and trigger at most three bounded
  coalesced retries instead of being treated as delivered.
