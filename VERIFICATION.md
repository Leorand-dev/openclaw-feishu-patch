# Verification — openclaw-feishu-patch

Current supported build: **`@openclaw/feishu@2026.10.9`**.

Upstream note: the 2026.10.9 `dist/.setup/monitor.account-*.mjs` is
byte-identical to 2026.10.8. The patch was re-verified against the 2026.10.9
npm tarball, so the repository ships only the 2026.10.9 patch.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.9/feishu-tool-aggregation.patch` | `b8ee0366f0191443b89c4d58beb3d8e2498daf760cb7fc07cefbd355fd8e148c` |
| pristine bundle, 2026.10.9 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.9 | `9cd54d3261639e2e40a401dcf6480acd555a8c458b29b696836b0f85a3f54496` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Patch shape

- **32 hunks**, unified diff against `original.mjs`.
- Forward apply: `ec9d77bf…` → `9cd54d32…` (byte-exact).
- Reverse apply: `9cd54d32…` → `ec9d77bf…` (byte-exact).
- Anchor adapter: all 32 hunks relocated by exact old-block match with
  `offset=+0`; no fuzz, no line-number drift.

## Test results (2026.10.9 patched bundle)

`tests/run-all.mjs` → **11/11 suites, 0 failed, 530 assertions**:

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
| **total** | **530** |

The same suite was re-run on the deployed bundle on the canary host:
**11/11 suites, 0 failed, 530 assertions**, target SHA-256 `9cd54d32…`.

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

The UI-batch-1 bundle (`9cd54d32…`) was deployed to all seven monitored hosts
on 2026-10-30: one canary host at 13:06 CST, five more Linux hosts at
15:06–15:08 CST, and the macOS host at 19:31 CST. Each host was upgraded from
the previous patched bundle (`6f229a5a…`); every replacement was backed up as
`.monitor.backup-ui-batch1-<UTC timestamp>.mjs` next to the target. After
restart all seven hosts reported the gateway active and `/health` = `200`, and
the deployed bundle SHA-256 was re-checked as `9cd54d32…` on every host. The
first post-deploy Feishu turn (13:31:32–13:34:25 CST, canary host) opened and
closed its streaming card normally, with `dispatch complete` and no
`Status update failed` entries; a second turn at 13:36 also completed normally.

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
