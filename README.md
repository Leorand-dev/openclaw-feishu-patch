# openclaw-feishu-patch

An installable, **build-pinned** patch for the OpenClaw Feishu channel plugin.

It turns tool-call progress, commentary and process events into **one readable streaming card** instead of a wall of bubbles. The answer body stays clean: a phase status line and a transient activity line show progress while the turn runs, and the full history collapses into a chronological process record after the answer.

- **Supported plugin build:** `@openclaw/feishu` **2026.10.5 / 2026.10.6 / 2026.10.7 / 2026.10.8**
- **Patch type:** unified diff against the installed `dist/.setup/monitor.account-*.mjs`
- **Install:** one shell script; exact SHA-256 check; automatic backup; automatic rollback on failure
- **No credentials required by this repository**

> This repository ships the patch, installer, tests, adapter and docs only. It does not redistribute the upstream plugin bundle.

---

## What it does

- Folds recognized tool/narration/process progress into one streaming card, including generic bare labels such as `Nodes`.
- Phase status line shows stage, tool count and elapsed time; the final status keeps a single completion summary.
- Phase status line is a single **grey** row that also carries the latest narration while the turn runs; the separate activity row was removed.
- Process panel keeps a static header and writes its body in place, so an expanded panel stays expanded; the body opens with grey event/tool/error counts.
- Process rows use per-tool icons with bold relative timestamps and code-styled labels.
- Empty/tool-only turns keep a readable chat preview (`✅ 完成 · N 工具 · Xs`) instead of an invisible zero-width summary; per-turn update budgets roll over each minute so long tool runs are not frozen.
- Long answers surface the page index in the status line (`✅ 完成 · … · 📄 1/3`) instead of hiding it in the footer; tool errors raise a 4s transient status notice.
- Transient activity line shows only the latest narration before the answer starts, then disappears so the answer body is not displaced.
- One collapsed `🧾 过程记录` panel contains reasoning plus a chronological activity timeline.
- Consecutive identical tools are merged (`Exec ×N`); the timeline header reports the true total event count.
- Background progress gets a dedicated `🧾 后台任务 · <agent>` card instead of standalone posts.
- Long answers paginate: the first chunk stays in the streaming card (footer `1/N`), continuation cards are numbered `2/N`, `3/N` and omit details/footer; media is delivered after the page sequence.
- Group mention requirements are preserved on paginated cards and continuations.
- Final dedupe covers paginated sends; background card closes are serialized so a new turn cannot race a stale background card.
- Prewarms the card at reply start and shows an immediate status (no blank warm card).
- Holds an active card until final delivery; merges cumulative block text instead of blindly appending; prevents duplicate cards and duplicated answer prefixes.
- On 2026.10.8 builds, carries upstream's frozen-prefix streaming model (`onAssistantMessageStart` boundary, PR #182438) and the Card JSON 2.0 `column_set` action-card fix (PR #79832) on top of the aggregation layout.
- Caches/limits reasoning preview; final cards remove the thinking panel when an answer exists.
- Card updates are coalesced into a 300ms window; status and process-record writes have per-turn budgets.
- A card watchdog force-finalizes cards that exceed the maximum lifetime.
- Reasoning and tool-error text are capped/redacted before entering the process record.
- Exact-build installer: unknown builds are refused, never fuzzy-patched; automatic backup and rollback.
- Anchor adapter for future builds; CI matrix validates 10.5 / 10.6 / 10.7 / 10.8.
- Content-free diagnostics for tool-shaped payloads that could not be aggregated.
- Installer `--check` / `--dry-run`, atomic target replacement, install lock and GNU `sha256sum` / BSD `shasum` fallback.
- Generated installer version table + CI release/docs consistency checks.

---

## Supported build

| item | value |
| --- | --- |
| OpenClaw Feishu plugin | `@openclaw/feishu@2026.10.5` / `2026.10.6` / `2026.10.7` / `2026.10.8` |
| pristine bundle, 2026.10.5–10.7 | `72a0a198e31e71e4690e2b86296d53983863e99e8d3a0872ac4cbb83aefe3bfe` |
| patched bundle, 2026.10.5–10.7 | `25bf3802fbf87768c27132952d83c238063f5612c550b1ebb64eee66306db23c` |
| patch, 2026.10.5–10.7 | `f3ed1a22375fd74da571ed5a3d005c94ed6116683c1f01192e63e8772c76e988` |
| pristine bundle, 2026.10.8 | `ec9d77bfcaf19bad9e888e62bc7c3a1dce8b3c1b4cfbcb1eca9a2b26070cfdf4` |
| patched bundle, 2026.10.8 | `6f229a5a43d108679c5d09770f88ae0849b18d62771bd9131a338b20db8c7092` |
| patch, 2026.10.8 | `cd64578f8d12a0ede4bb50f18666948b272682c14543ffa4124a4fc1e3dfd54f` |
| patch hunks | 32 (2026.10.5–10.7), 31 (2026.10.8) |
| test assertions | 502 (2026.10.5–10.7), 513 (2026.10.8) |

The installer computes the SHA-256 of the target bundle and only applies when it matches one of the pristine hashes above. If the target is already patched, it reports `already patched`. Any other build is **refused**.

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

`run-all.mjs` runs all eleven suites. Node 24+ is expected. The suites read the bundle path from `argv[2]` (or `BUNDLE`), so they can also audit an installed live copy.

Mechanical checks:

```sh
# requires the pristine/patched bundle pairs next to each patch (internal worktree)
python3 tools/verify_patch.py --all=patches
```

Expected results: 2026.10.5–10.7 → 32 hunks, forward/reverse byte-exact, 11/11 suites, 502 assertions; 2026.10.8 → 31 hunks, forward/reverse byte-exact, 11/11 suites, 513 assertions. CI re-runs all of it against the pristine npm tarballs.

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
| status position | top |
| elapsed refresh | 15s |
| compact status | single phase line |
| narration cap | 80 characters |
| details display | one collapsed `🧾 过程记录` panel with reasoning and a chronological activity timeline |
| narration display | transient activity line above the answer while running; hidden once the answer starts; history in the process timeline |
| no-card progress | a dedicated background card instead of standalone posts |
| long answer pagination | first chunk stays in the streaming card; continuation cards are numbered `2/N`, `3/N` with no repeated details/footer; media is sent after the pages |
| completion status | final status element keeps `✅ 完成 · tools · errors · elapsed`; the body does not repeat it |
| background card | background work gets a distinct `🧾 后台任务 · <agent>` header |
| hide reasoning in final card | panel removed when answer exists |
| final tool summary | on |
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
  2026.10.6/
    feishu-tool-aggregation.patch
  2026.10.7/
    feishu-tool-aggregation.patch
  2026.10.8/
    feishu-tool-aggregation.patch
tests/                        nine JavaScript suites
tools/
  adapt_patch.py              anchor-based adapter for future builds
  verify_patch.py             strict patch applier/verifier
.github/workflows/verify.yml  CI matrix
```

---

## License

MIT — see [`LICENSE`](./LICENSE).

This is a modification of the OpenClaw Feishu channel plugin; the upstream plugin and its code remain subject to their own license.
