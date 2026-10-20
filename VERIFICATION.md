# Verification — openclaw-feishu-patch

Current initial version: **`@openclaw/feishu@2026.10.5`**.

## Artifacts

| file | SHA-256 |
| --- | --- |
| `patches/2026.10.5/feishu-tool-aggregation.patch` | `0af5327a3060ef7aa5f761ae6524706fc6642bccf9709e40c6b2c42fc2681f67` |
| patched bundle | `95de6838c666f98146d241a4b1ed8672d1c5529be7e2e9f30cca2914049eed99` |
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
110 parser/delivery
26 waiting-line/aggregation
26 block-fold/status-line
33 execution harness
33 idle/timer/content
32 narration ticker
56 display/backfill/session
100 structural audit
= 416 assertions, 8/8 suites passed
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
