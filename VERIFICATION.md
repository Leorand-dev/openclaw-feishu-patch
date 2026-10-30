# Verification — openclaw-feishu-patch

Current supported build: **`@openclaw/feishu@2026.10.9`**.

Upstream note: the 2026.10.9 `dist/.setup/monitor.account-*.mjs` is
byte-identical to 2026.10.8. The patch was re-verified against the 2026.10.9
npm tarball, so the repository ships only the 2026.10.9 patch.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.9/feishu-tool-aggregation.patch` | `cd64578f8d12a0ede4bb50f18666948b272682c14543ffa4124a4fc1e3dfd54f` |
| pristine bundle, 2026.10.9 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.9 | `6f229a5a43d108679c5d09770f88ae0849b18d62771bd9131a338b20db8c7092` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Patch shape

- **31 hunks**, unified diff against `original.mjs`.
- Forward apply: `ec9d77bf…` → `6f229a5a…` (byte-exact).
- Reverse apply: `6f229a5a…` → `ec9d77bf…` (byte-exact).
- Anchor adapter: all 31 hunks relocated by exact old-block match with
  `offset=+0`; no fuzz, no line-number drift.

## Test results (2026.10.9 patched bundle)

`tests/run-all.mjs` → **11/11 suites, 0 failed, 513 assertions**:

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
| layout: merged status / icons / panel stats / pagination | 33 |
| **total** | **513** |

## Release checks

- `tools/finalize.py` → 1 build, current 2026.10.9; manifest, installer
  `VERSIONS` block and `patches/SHA256SUMS` agree.
- `tools/verify_patch.py --all=patches` → forward/reverse byte-exact.
- `node --check` on the patched bundle → pass.
- `tools/check_docs.py` → release checks OK (1 supported version, 3 docs).
- GitHub Actions `verify-patch` fetches `@openclaw/feishu@2026.10.9` from npm,
  runs the anchor adapter, installer apply/idempotency/reverse-diff and the full
  test suite.

## Deployment evidence

The same patched bundle (`6f229a5a…`) is deployed to the seven monitored
hosts running OpenClaw 2026.10.9; each host keeps a
`.monitor.backup-109-*.mjs` backup next to the bundle and returned
`health=200` after restart.

## Behavior covered by this patch

- Empty/tool-only turns keep a readable chat preview (`✅ 完成 · N 工具 · Xs`).
- The process panel keeps a static header and writes its body in place, so an
  expanded panel stays expanded; the body opens with grey event/tool/error
  counts.
- Block updates merge cumulative text; a shorter delta never replaces longer
  accumulated prose.
- Narration merged into the grey status row strips `<`/`>`.
- The transient tool-error notice is cleared when the assistant starts.
- Update budgets use a rolling 60s window (120 status / 180 details), so long
  tool runs are not frozen.
- Schema-rejected config reads (`cardIdleHoldMs`, `cardStatusElement`,
  `progressTexts`, `prewarmCard`) are absent; fixed defaults are compiled in.
