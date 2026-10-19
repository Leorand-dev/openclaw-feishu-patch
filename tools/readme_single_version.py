# -*- coding: utf-8 -*-
"""README rework: single initial version + anchor adapter / CI matrix / schema note."""
import pathlib

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t = P.read_text(encoding="utf-8")


def replace_section(start, end, new):
    global t
    s = t.index(start)
    e = t.index(end, s)
    t = t[:s] + new + t[e:]


# ---- version table: only current initial build ----
replace_section("## Version table", "## Install", """## Version table

| plugin build | patch file | pristine sha256 | patched sha256 |
| --- | --- | --- | --- |
| `@openclaw/feishu` 2026.10.5 | `patches/2026.10.5/feishu-tool-aggregation.patch` | `72a0a198…3bfe` | `1d9eb846…f3e8` |

This repository starts with **one supported initial build**. New builds are not
silently fuzzy-patched: the installer compares SHA-256 against the known
pristine/patched hashes and refuses an unknown build. Adding a build means
re-running the anchor adapter and appending a row + manifest entry.

""")

# ---- cleanup wording ----
t = t.replace("13. **Cleanup** — 2026.10.2 leftovers", "13. **Cleanup** — earlier port leftovers", 1)

# ---- verify section: only current suites ----
replace_section("## Verify", "## Revert", """## Verify

```sh
sha256sum -c SHA256SUMS
cd tests
# TARGET = the patched bundle (installed path or local patched.mjs)
node run-all.mjs "$TARGET"

# individual suites
V="$TARGET"
node test-wayD-105.mjs $V        # parser / narration guard / media preservation
node test-wayB-105.mjs $V        # waiting line + aggregation
node test-wayC-105.mjs $V        # mid-turn block fold + status-line ownership
node exec-agg-105.mjs $V         # execution harness (deliver decisions)
node test-idle-release-105.mjs $V  # hold timer / release lifecycle
node test-narration-ticker-105.mjs $V  # option-B narration ticker
node test-display-backfill-105.mjs $V  # backfill + status element
node audit-agg-105.mjs $V        # structural audit
```

`run-all.mjs` runs every 2026.10.5 suite; the suites read the bundle path from
`argv[2]` (or `BUNDLE`), so you can point them at an installed file to audit the
live copy. CI runs the same matrix against a freshly fetched npm bundle.

""")

# ---- remove old-version comparison section ----
replace_section("### What changed against 2026.10.2", "### Bare-label payloads", """### Initial 2026.10.5 behavior

This repository starts at the 2026.10.5 build. The sections below describe that
initial behavior; no older plugin builds are shipped.

""")

# ---- config schema note before verboseLevel prerequisite ----
anchor = "### Requires `verboseLevel: on`"
note = """> **Plugin schema note.** OpenClaw's `openclaw.plugin.json` currently rejects
> unknown Feishu config keys (`must not have additional properties`). The config
> table below documents the **code defaults / reserved keys** implemented by this
> patch; setting them in `channels.feishu` makes the config invalid until a
> schema adapter is added. Treat them as compiled defaults for now.

"""
assert anchor in t
t = t.replace(anchor, note + anchor, 1)

# ---- upgrade warning → anchor adapter workflow ----
replace_section("## Upgrade warning", "## Layout", """## Upgrading to a new plugin build

Upgrading OpenClaw or `@openclaw/feishu` rewrites `dist/` and reverts the patch.
After an upgrade:

```sh
grep -c parseCollapsibleToolSummary ~/.openclaw/npm/projects/*/node_modules/@openclaw/feishu/dist/.setup/monitor.account-*.mjs
```

`0` means the patch is gone. Fetch/re-derive it for the new build:

1. **Extract the new pristine bundle** (`npm pack @openclaw/feishu@<new>`).
2. **Run the anchor adapter** against the previous reference patch:

   ```sh
   python3 tools/adapt_patch.py \
     --pristine "$NEW_BUNDLE" \
     --from-patch patches/2026.10.5/feishu-tool-aggregation.patch \
     --version <new-version> \
     --out-dir patches/<new-version> \
     --update-manifest --set-current
   ```

   It re-locates every hunk by its **full old block** (context + removed
   lines), requires a unique match, and never uses line numbers or fuzz. If
   upstream changed a block, it fails loudly; review the diff manually instead
   of forcing it.

3. **Review/rebase** the generated diff, then:
   - add the printed install line to `install.sh`;
   - append the version to `.github/workflows/verify.yml` matrix;
   - run `python3 tools/verify_patch.py --all` and the full test suite;
   - canary deploy, check card create/status/close logs, then commit.

The installer always applies only an **exact pristine hash**, creates a backup,
and verifies the post-patch hash; failure restores the backup. An unknown build
is refused rather than patched with fuzz.

""")

# ---- layout ----
replace_section("## Layout", "## License", """## Layout

```
README.md                       project overview, install, verify, adapter workflow
VERIFICATION.md                 local verification + sanitized live-test record
LICENSE                         MIT
install.sh                      exact-build installer: hash select, backup, rollback
SHA256SUMS                      patch + installer hashes
.github/workflows/verify.yml    CI matrix: fetch pristine → adapter check → tests
patches/
  MANIFEST.json                 supported version hashes/status (source of truth)
  2026.10.5/
    feishu-tool-aggregation.patch    current initial patch
tests/
  run-all.mjs                 suite runner
  test-wayD-105.mjs           parser / narration guard / media preservation
  test-wayB-105.mjs           waiting line + aggregation
  test-wayC-105.mjs           mid-turn block fold + status-line ownership
  exec-agg-105.mjs            execution harness (deliver decisions)
  test-idle-release-105.mjs   hold timer / release lifecycle
  test-narration-ticker-105.mjs narration ticker (option B)
  test-display-backfill-105.mjs latest-state backfill + status element
  audit-agg-105.mjs           structural audit
tools/
  adapt_patch.py              anchor-based rebase adapter
  verify_patch.py             strict patch applier/verifier
```

The upstream plugin bundles (`original.mjs` / `patched.mjs`) are not
redistributed in the GitHub repository; apply the diff to your local installed
build. The old 2026.10.1/2026.10.2 versions are intentionally not included.

""")

# ---- historical phrasing ----
t = t.replace("Earlier ports folded per-tool\nlines into a summary", "Earlier implementations folded per-tool\nlines into a summary", 1)

P.write_text(t, encoding="utf-8", newline="\n")
print("README reworked")
