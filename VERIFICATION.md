# Verification — openclaw-feishu-patch

Current supported versions: **`@openclaw/feishu@2026.10.5`, `@openclaw/feishu@2026.10.6`, and `@openclaw/feishu@2026.10.7`** (identical monitor bundle).

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.5/feishu-tool-aggregation.patch` | `1b1f8d0e0b17d19fc4b8dbb5b2b4c9375114fe589692a8fe4f907277ca21d94f` |
| `patches/2026.10.6/feishu-tool-aggregation.patch` | `1b1f8d0e0b17d19fc4b8dbb5b2b4c9375114fe589692a8fe4f907277ca21d94f` |
| patched bundle | `cb2e0442d49a64cc9deed47d9239181ff7a67e9eed0fb67356b2d22cfe0a3549` |
| pristine bundle | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Mechanical verification

- Patch size: **30 hunks**.
- `original.mjs` + patch → `patched.mjs`: forward **byte-exact** (offset 0).
- Reverse patch: **byte-exact**.
- `node --check patched.mjs`: exit 0.
- Installer: exact pristine hash select; backup; post-patch hash; idempotent
  `already patched`; unknown builds refused.

## Test suites

`tests/run-all.mjs` against the patched bundle:

```
110 parser/delivery
26 waiting-line/aggregation
26 block-fold/status-line
33 execution harness
33 idle/timer/content
32 narration ticker
56 display/backfill/session
103 structural audit
= 439 assertions, 8/8 suites passed
```

## Sanitized live verification

On a live OpenClaw 2026.10.5 / Feishu instance, and re-verified on 2026.10.6 and 2026.10.7:

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

## Installer / CI hardening

- `install.sh --check` reports `status=pristine|patched|unknown` without writing.
- `install.sh --dry-run` validates the exact build and prints the planned action.
- The real apply path uses a per-directory lock and an atomic temp-file replace;
  the backup and rollback path remains.
- `tools/check_docs.py` enforces that installer VERSIONS and public docs carry the
  manifest's full hashes. CI runs it plus installer check/dry-run/idempotency.

## Reproduction

```sh
sha256sum -c SHA256SUMS
cd tests
node run-all.mjs "$TARGET"
python3 tools/verify_patch.py --all=patches
```

`$TARGET` is the patched monitor bundle path. Node 24+ expected.
