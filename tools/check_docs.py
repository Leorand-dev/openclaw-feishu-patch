# -*- coding: utf-8 -*-
"""Check public docs, installer, sums and history against the reviewed release tree.

Fails when a supported version's hashes are missing from the public docs, the
generated installer blocks are stale, the documented hunk/assertion counts have
drifted from the files, or the SHA256SUMS files do not match the tree. Used by
CI and by the release/export flow.
"""
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATCHES = ROOT / "patches"
MANIFEST = PATCHES / "MANIFEST.json"
HISTORY = PATCHES / "HISTORY.json"
INSTALLER = ROOT / "install.sh"
DOCS = [ROOT / "README.md", ROOT / "AGENTS.md", ROOT / "VERIFICATION.md"]
TESTS = ROOT / "tests"

SUITE_LABELS = [
    ("parser/structured-details/content-only helpers", "test-helpers-1111.mjs"),
    ("aggregation/status/details", "test-aggregation-1111.mjs"),
    ("finalization/reliability", "test-finalization-1111.mjs"),
    ("streaming-session shape", "test-streaming-session-1111.mjs"),
    ("idle-hold behavior", "test-idle-hold-1111.mjs"),
]


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
supported = [v for v in manifest.get("versions", []) if v.get("status") == "supported"]
if not supported:
    fail("MANIFEST has no supported versions")

installer = INSTALLER.read_text(encoding="utf-8")
present_docs = [p for p in DOCS if p.exists()]

# ---- hashes in the installer and docs -------------------------------------
for entry in supported:
    for key in ("original_sha256", "patched_sha256", "patch_sha256"):
        value = entry.get(key)
        if not value or len(value) != 64:
            fail(f"{entry['version']} {key} is not a 64-char sha256")
        if value not in installer:
            fail(f"install.sh is missing {entry['version']} {key}={value}")
    for doc in present_docs:
        text = doc.read_text(encoding="utf-8")
        for key in ("original_sha256", "patched_sha256", "patch_sha256"):
            if entry[key] not in text:
                fail(f"{doc.name} is missing {entry['version']} {key}={entry[key]}")

# ---- generated installer blocks -------------------------------------------
blocks = re.findall(r"# BEGIN GENERATED VERSIONS(.*?)# END GENERATED VERSIONS", installer, re.S)
if len(blocks) != 1:
    fail(f"install.sh must have exactly one generated VERSIONS block, found {len(blocks)}")
for entry in supported:
    expected = f'{entry["version"]} {entry["original_sha256"]} {entry["patched_sha256"]} {entry["patch_sha256"]}'
    if expected not in blocks[0]:
        fail(f"install.sh VERSIONS block is stale for {entry['version']}")

# ---- upgrade deltas -------------------------------------------------------
upgrades = manifest.get("upgrades", [])
if upgrades:
    upgrade_blocks = re.findall(r"# BEGIN GENERATED UPGRADES(.*?)# END GENERATED UPGRADES", installer, re.S)
    if len(upgrade_blocks) != 1:
        fail(f"install.sh must have exactly one generated UPGRADES block, found {len(upgrade_blocks)}")
    sums = (PATCHES / "SHA256SUMS").read_text(encoding="utf-8")
    for upgrade in upgrades:
        expected = f'{upgrade["from_sha256"]} {upgrade["to_sha256"]} {upgrade["patch_sha256"]}'
        if expected not in upgrade_blocks[0]:
            fail(f"install.sh UPGRADES block is stale for {upgrade['patch']}")
        if upgrade["patch_sha256"] not in sums:
            fail(f"patches/SHA256SUMS is missing {upgrade['patch']}")
        for doc in present_docs:
            if upgrade["from_sha256"] not in doc.read_text(encoding="utf-8"):
                fail(f"{doc.name} is missing the upgradable source SHA-256 {upgrade['from_sha256']}")

# ---- previous patched builds (in-place upgrade) ---------------------------
if not HISTORY.is_file():
    fail("patches/HISTORY.json is missing")
history = json.loads(HISTORY.read_text(encoding="utf-8"))
if history.get("schema") != 1:
    fail("HISTORY.json schema must be 1")
current_patched = {entry["patched_sha256"] for entry in supported}
known = [e for e in history.get("patched", []) if e.get("sha256") and e.get("version")]
known = [e for e in known if e["sha256"] not in current_patched]
known_blocks = re.findall(r"# BEGIN GENERATED KNOWN_PATCHED(.*?)# END GENERATED KNOWN_PATCHED", installer, re.S)
if len(known_blocks) != 1:
    fail(f"install.sh must have exactly one generated KNOWN_PATCHED block, found {len(known_blocks)}")
for entry in known:
    if f'"{entry["sha256"]} {entry["version"]}"' not in known_blocks[0]:
        fail(f"install.sh KNOWN_PATCHED block is missing {entry['version']} {entry['sha256']}")
for current in supported:
    if f'"{current["patched_sha256"]} {current["version"]}"' in known_blocks[0]:
        fail(f"KNOWN_PATCHED must not list the current patched build {current['version']}")

# ---- hunks and assertion counts documented in the docs --------------------
hunks = {}
for entry in supported:
    patch_path = PATCHES / entry["patch"]
    if not patch_path.is_file():
        fail(f"patch file missing: {patch_path}")
    hunks[entry["version"]] = patch_path.read_text(encoding="utf-8").count("\n@@ ")
hunk_values = set(hunks.values())
if len(hunk_values) != 1:
    fail(f"supported builds disagree on hunk count: {hunks}")
hunk_count = hunk_values.pop()

suite_counts = {}
for label, filename in SUITE_LABELS:
    test_path = TESTS / filename
    if not test_path.is_file():
        fail(f"test suite missing: {test_path}")
    suite_counts[label] = len(re.findall(r'\bok\("', test_path.read_text(encoding="utf-8")))
assertion_total = sum(suite_counts.values())

for doc in present_docs:
    text = doc.read_text(encoding="utf-8")
    if doc.name == "VERIFICATION.md":
        if f"| hunks | {hunk_count} | {hunk_count} |" not in text:
            fail(f"{doc.name} hunk row must read | hunks | {hunk_count} | {hunk_count} |")
        for label, count in suite_counts.items():
            if not re.search(rf"^\| {re.escape(label)}[^|]*\| {count} \|$", text, re.M):
                fail(f"{doc.name} suite row for {label} must be {count}")
        if f"| **total** | **{assertion_total}** |" not in text:
            fail(f"{doc.name} total row must be **{assertion_total}**")
        if f"**5/5 suites, 0 failed, {assertion_total} assertions**" not in text:
            fail(f"{doc.name} test summary must state {assertion_total} assertions")
    else:
        if f"| patch hunks | {hunk_count} | {hunk_count} |" not in text:
            fail(f"{doc.name} patch-hunk row must read | patch hunks | {hunk_count} | {hunk_count} |")
        if f"| test assertions | {assertion_total} | {assertion_total} |" not in text:
            fail(f"{doc.name} assertion row must read | test assertions | {assertion_total} | {assertion_total} |")
        if f"{assertion_total} assertions" not in text:
            fail(f"{doc.name} must state {assertion_total} assertions")

# ---- SHA256SUMS files match the tree --------------------------------------
for sums_rel, base in (("SHA256SUMS", ROOT), ("SHA256SUMS", PATCHES)):
    sums_path = base / "SHA256SUMS"
    if not sums_path.is_file():
        fail(f"{sums_rel} is missing")
    for line in sums_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        want, rel = line.split(None, 1)
        rel = rel.strip()
        target = base / rel
        if not target.is_file():
            fail(f"{sums_rel} lists a missing file: {rel}")
        if sha(target) != want:
            fail(f"{sums_rel} hash mismatch for {rel}")

print(
    f"release checks OK: {len(supported)} supported version(s), {len(upgrades)} upgrade(s), "
    f"{len(known)} previous patched build(s), {hunk_count} hunks, {assertion_total} assertions, "
    f"{len(present_docs)} docs"
)
