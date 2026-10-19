# Verification — openclaw-feishu-patch

Current initial version: **`@openclaw/feishu@2026.10.5`**.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.5/feishu-tool-aggregation.patch` | `a8aae50ba9c3f4c8a4a47c6a5b1d944b75e1fe11241d2a63e11388264c2e5db9` |
| patched bundle | `c28c462e24625d32e9a1ed8fdc7e21edb2c017c3c6a04b7ba24fff52ec5b5fe3` |
| pristine bundle | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |

The bundle files are not redistributed here; hashes are reference values for the
exact supported build.

## Mechanical verification

- Patch size: **29 hunks**.
- `original.mjs` + patch → `patched.mjs`: forward **byte-exact** (offset 0).
- Reverse patch: **byte-exact**.
- `node --check patched.mjs`: exit 0.
- Installer: exact pristine hash select; backup; post-patch hash; idempotent
  `already patched`; unknown builds refused.

## Test suites

`tests/run-all.mjs` against the patched bundle:

```
72 parser/delivery
26 waiting-line/aggregation
26 block-fold/status-line
33 execution harness
33 idle/timer/content
32 narration ticker
55 display/backfill/session
100 structural audit
= 377 assertions, 8/8 suites passed
```

## Sanitized live verification

On a live OpenClaw 2026.10.5 / Feishu instance:

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

## Reproduction

```sh
sha256sum -c SHA256SUMS
cd tests
node run-all.mjs "$TARGET"
python3 tools/verify_patch.py --all=patches
```

`$TARGET` is the patched monitor bundle path. Node 24+ expected.
