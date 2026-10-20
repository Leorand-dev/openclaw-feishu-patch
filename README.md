# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It turns tool-call progress and mid-turn narration into **one tidy streaming card** instead of a wall of bubbles, and hardens the streaming-card lifecycle so retries/reorderings do not create duplicate cards or duplicated answer text.

- **Supported plugin build:** `@openclaw/feishu` **2026.10.5**
- **Patch type:** unified diff against the installed `dist/.setup/monitor.account-*.mjs`
- **Install:** one shell script; exact SHA-256 check; automatic backup; automatic rollback on failure
- **No credentials required by this repository**

> This repository ships the patch, installer, tests, adapter and docs only. It does not redistribute the upstream plugin bundle.

---

## What it does

- Folds recognized tool-summary events into one bounded card.
- Shows only the latest narration as a single rolling ticker line (no narration bubbles).
- Prewarms the card at reply start and shows an immediate status (no blank warm card).
- Uses a dedicated card `status` element for progress/narration, so progress updates do not rewrite the answer body.
- Keeps the waiting line visible across tool batches; after tools finish it switches to `✅ 已执行 N 个工具 · 生成回复中…`.
- Holds an active card until the final delivery, preventing the “one answer, 2–3 cards” lifecycle bug.
- Merges cumulative block text instead of appending it blindly, preventing duplicated answer prefixes inside one card.
- Records fallback final sends in the final-dedupe set, preventing duplicate final deliveries.
- Compact status (primary line + at most one narration line), configurable elapsed refresh, shorter narration cap.
- Deletes the `status` element at close so the final card has no empty status gap.
- Caches/limits reasoning preview; final cards hide thinking when an answer exists.
- Exact-build installer: unknown builds are refused, never fuzzy-patched.
- Anchor adapter for deriving the patch for future builds; CI matrix validates the result.

---

## Supported build

| item | value |
| --- | --- |
| OpenClaw Feishu plugin | `@openclaw/feishu@2026.10.5` |
| pristine bundle SHA-256 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched bundle SHA-256 | `95de6838c666f98146d241a4b1ed8672d1c5529be7e2e9f30cca2914049eed99` |
| patch SHA-256 | `0af5327a3060ef7aa5f761ae6524706fc6642bccf9709e40c6b2c42fc2681f67` |
| patch hunks | 29 |
| test assertions | 416 |

The installer computes the SHA-256 of the target bundle and only applies when it matches the pristine hash above. If the target is already patched, it reports `already patched`. Any other build is **refused**.

---

## Quick install

Requirements: Linux/macOS (or WSL), `bash`, `patch`, `sha256sum`.

```sh
git clone https://github.com/Leorand-dev/openclaw-feishu-patch.git
cd openclaw-feishu-patch

TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
./install.sh "$TARGET"

# restart the OpenClaw gateway (systemd example)
systemctl --user restart openclaw-gateway.service
```

The installer prints the backup path and the patched SHA-256. It verifies the post-patch hash and restores the backup automatically on any failure.

For agent-oriented instructions see [`AGENTS.md`](./AGENTS.md).

---

## Verify

```sh
sha256sum -c SHA256SUMS

cd tests
node run-all.mjs "$TARGET"
```

`run-all.mjs` runs all eight suites. Node 24+ is expected. The suites read the bundle path from `argv[2]` (or `BUNDLE`), so they can also audit an installed live copy.

Mechanical checks:

```sh
python3 tools/verify_patch.py --all=patches
```

Expected results for the supported build: 29 hunks, forward/reverse byte-exact, 8/8 suites, 416 assertions.

---

## Rollback

The installer creates `.monitor.backup-*.mjs` next to the target. To roll back:

```sh
TARGET=$(ls ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs | head -1)
cp -p "$(ls -t "$(dirname "$TARGET")"/.monitor.backup-*.mjs | head -1)" "$TARGET"
systemctl --user restart openclaw-gateway.service
```

The patched bundle hash can also be matched against `patches/MANIFEST.json` to confirm state.

---

## Configuration and behavior defaults

The patch currently exposes behavior through **code defaults**. OpenClaw's plugin schema rejects unknown Feishu config keys (`must not have additional properties`), so do **not** add these keys to `channels.feishu` unless a schema adapter is installed; it will make the config invalid.

Current defaults:

| behavior | default |
| --- | --- |
| prewarm card at reply start | on |
| dedicated `status` element | on |
| status position | bottom |
| elapsed refresh | 15s |
| compact status | primary line + one narration line |
| narration cap | 80 characters |
| reasoning preview cap | 12 lines |
| hide reasoning in final card | on (when answer exists) |
| final tool summary | off |
| final chat preview | answer summary, `✅ 已回复` fallback |

Prerequisite for tool-summary aggregation: **`verboseLevel: on`**. With `verboseLevel: off` tool events never reach the plugin hooks, so no progress line is aggregated.

---

## Upgrading to a new plugin build

This is intentionally not a fuzzy patch. For a new `@openclaw/feishu` build:

1. Fetch/extract the new pristine bundle.
2. Run the anchor adapter using the current patch as the reference:

   ```sh
   python3 tools/adapt_patch.py \
     --pristine "$NEW_BUNDLE" \
     --from-patch patches/2026.10.5/feishu-tool-aggregation.patch \
     --version <new-version> \
     --out-dir patches/<new-version> \
     --update-manifest --set-current
   ```

3. The adapter re-locates every hunk by its full old block, requires a unique match, and never uses line numbers/fuzz. If upstream changed the block, it fails loudly.
4. Review the diff, add the printed install line to `install.sh`, add the version to the CI matrix, run the tests, canary the new build, then commit.

The CI workflow (`.github/workflows/verify.yml`) validates supported versions by fetching the pristine npm package, running the anchor adapter, applying the patch, doing a reverse-diff sanity check, and running all tests.

---

## Requirements and limitations

- **`verboseLevel: on`** is required for tool-summary aggregation.
- MCP/custom tools outside the normalized label whitelist, and shell summaries emitted as detail-only text in `verboseLevel: full`, keep the legacy delivery path rather than being counted in the card.
- This patch targets one exact plugin build. Upgrading `@openclaw/feishu` rewrites `dist/` and reverts the patch; re-apply or re-derive it.
- The plugin's config schema is not extended by this repository; behavior defaults are compiled in.
- The installer uses `patch`, `sha256sum` and `bash`; Windows users should use WSL or an equivalent POSIX environment.
- No credentials, tokens or host-specific data are stored in this repository.

---

## Troubleshooting

### Tool/narration bubbles after a gateway restart

If the OpenClaw gateway is restarted **while a turn is streaming** (for example
via a `/restart` command or a supervisor restart), the plugin's streaming card
is closed by the outage. During restart recovery, tool and narration progress
can be emitted before a new streaming card exists, so some of it may appear as
standalone posts (for example `Exec`, `View Image`, `💬 ...`). A separate
recovery card may also appear.

This is **restart-recovery behavior**, not a missing label in the aggregation
whitelist. Labels such as `Exec` and `View Image` are already covered. Once a
new user turn starts after the gateway is healthy, progress returns to the
single-card flow.

Mitigation: restart the gateway when idle. An optional future guard could
suppress recognized tool-summary posts while streaming start is in backoff, at
the cost of temporarily hiding tool progress during recovery.

### Empty or missing status before the first tool

A prewarmed card shows `⏳ 思考中…` until the first tool, narration, or answer
text arrives. Silent turns with no content/tools/narration discard the empty
card instead of leaving it behind.

## Repository layout

```
README.md                     this file
AGENTS.md                     concise instructions for automated agents
VERIFICATION.md               verification evidence for the current build
LICENSE                       MIT
install.sh                    exact-build installer: hash select, backup, rollback
SHA256SUMS                    installer + manifest + patch hashes
patches/
  MANIFEST.json               supported version hashes/status
  2026.10.5/
    feishu-tool-aggregation.patch
tests/                        eight JavaScript suites
tools/
  adapt_patch.py              anchor-based adapter for future builds
  verify_patch.py             strict patch applier/verifier
.github/workflows/verify.yml  CI matrix
```

---

## License

MIT — see [`LICENSE`](./LICENSE).

This is a modification of the OpenClaw Feishu channel plugin; the upstream plugin and its code remain subject to their own license.
