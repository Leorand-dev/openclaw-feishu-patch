# Verification — openclaw-feishu-patch

Current supported versions: **`@openclaw/feishu@2026.10.5`, `2026.10.6`, `2026.10.7`
(identical monitor bundle) and `2026.10.8`** (rebased patch, separate bundle).

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.5/feishu-tool-aggregation.patch` | `f3ed1a22375fd74da571ed5a3d005c94ed6116683c1f01192e63e8772c76e988` |
| `patches/2026.10.6/feishu-tool-aggregation.patch` | `f3ed1a22375fd74da571ed5a3d005c94ed6116683c1f01192e63e8772c76e988` |
| `patches/2026.10.7/feishu-tool-aggregation.patch` | `f3ed1a22375fd74da571ed5a3d005c94ed6116683c1f01192e63e8772c76e988` |
| `patches/2026.10.8/feishu-tool-aggregation.patch` | `cd64578f8d12a0ede4bb50f18666948b272682c14543ffa4124a4fc1e3dfd54f` |
| pristine bundle, 2026.10.5–10.7 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched bundle, 2026.10.5–10.7 | `25bf3802fbf87768c27132952d83c238063f5612c550b1ebb64eee66306db23c` |
| pristine bundle, 2026.10.8 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.8 | `6f229a5a43d108679c5d09770f88ae0849b18d62771bd9131a338b20db8c7092` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported builds.

## Mechanical verification

- Patch size: **32 hunks** for 2026.10.5–10.7, **31 hunks** for 2026.10.8.
- `original.mjs` + patch → `patched.mjs`: forward **byte-exact** for both builds
  (anchor adapter re-locates every hunk by its full old block; no fuzz, no line
  numbers).
- `node --check patched.mjs`: exit 0 for both builds.
- Reverse diff of the 2026.10.8 patch is clean; the installer's
  `patch -p0` path is exercised by the CI matrix entry.
- Installer: exact pristine hash select; backup; post-patch hash; idempotent
  `already patched`; unknown builds refused.

### 2026.10.8 rebase notes

The 2026.10.8 plugin ships upstream PR #182438 (`fix(feishu): preserve streamed
text across tool calls`) and PR #79832 (Card JSON 2.0 `column_set` action cards).
Both touch code this patch owns, so the 10.8 patch is rebased rather than reused:

- upstream's frozen-prefix model is adopted (`onAssistantMessageStart` stores
  `snapshotBaseText`, snapshot updates replace only the current message, finals
  reuse the prefix, `preserveProgressCallbackStartOrder` set);
- the removed `mergeStreamingText` overlap heuristic is kept locally for
  cumulative **block** payloads, because the dispatcher still delivers blocks as
  overlapping/cumulative text;
- the 2026.10.5–10.7 hunks that depended on `lastSnapshotTextLength` were dropped;
- the `action` → `column_set` card builder change is carried over unchanged.

## Test suites

`tests/run-all.mjs` against the patched bundle, 11 suites:

```
                                 2026.10.5-10.7   2026.10.8
parser/delivery                        111            111
waiting-line/aggregation                 26             26
block-fold/status-line                   26             26
execution harness                        33             33
idle/timer/content                       35             35
narration ticker                         36             36
display/backfill/session                 53             53
structural audit                        123            123
stream boundary / action card            13             21
regressions (sanitizer/summary/errors)   16             16
layout pass                               33             33
total                                  502            513
```

Both matrices pass: `11/11 suites passed`.

## Sanitized live verification

On a live OpenClaw 2026.10.5 / Feishu instance, and re-verified on 2026.10.6 and
2026.10.7:

- One user message produced **one** streaming card (`Started streaming` once,
  `Closed streaming` once); no duplicate cards.
- Final card raw content contained **3 elements**: `content`, `hr`, `note`.
  The dedicated `status` element was removed at close, so no empty status gap
  remains.
- Final card `config.summary.content` was the answer summary, not
  `[Generating...]`.
- Final answer content appeared **once**; no duplicated prefix or repeated
  80-character block.
- A later live test on a host with multi-tool turns confirmed the final answer
  streams into the **same** card: one user message produced exactly one
  interactive card; the tool-progress card was not left behind.

2026.10.8 status: **ported and unit-verified only**. The 10.8 patch is validated
by the anchor adapter roundtrip, the 9-suite matrix and `node --check`, but no
authenticated Feishu round trip has run on a 10.8 host yet; a single-host canary
is pending. Do not claim 10.8 live rendering until that canary passes.

## Known recovery behavior

When the gateway is restarted while a turn is streaming, the streaming card is
closed. Restart-recovery output emitted before a new card exists can appear as
standalone posts (`Exec`, `View Image`, narration, etc.) and may include a
separate recovery card. These labels are already in the aggregation whitelist;
the behavior is caused by the restart window, not by a parser gap. A new turn
after the gateway is healthy returns to the single-card flow. Restarting while
idle avoids it.

## Installer / CI hardening

- `install.sh --check` reports `status=pristine|patched|unknown` without writing.
- `install.sh --dry-run` validates the exact build and prints the planned action.
- The real apply path uses a per-directory lock and an atomic temp-file replace;
  the backup and rollback path remains.
- `tools/check_docs.py` enforces that installer VERSIONS and public docs carry the
  manifest's full hashes. CI runs it plus installer check/dry-run/idempotency.
- `tools/finalize.py` regenerates each build's patch from its reviewed bundle
  pair, mirrors the shared 2026.10.5–10.7 patch, and re-syncs the manifest,
  installer table and `patches/SHA256SUMS`.

## Reproduction

```sh
sha256sum -c SHA256SUMS
cd tests
node run-all.mjs "$TARGET"
python3 tools/verify_patch.py --all=patches
```

`$TARGET` is the patched monitor bundle path. Node 24+ expected.
