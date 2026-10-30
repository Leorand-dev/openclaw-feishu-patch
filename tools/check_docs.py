# -*- coding: utf-8 -*-
"""Check public docs and installer against patches/MANIFEST.json.

Fails if a supported version's full SHA-256 is missing from the public docs,
or if install.sh's generated VERSIONS block does not match the manifest. Used
by CI and by the release/export flow.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "patches" / "MANIFEST.json"
INSTALLER = ROOT / "install.sh"
DOCS = [ROOT / "README.md", ROOT / "AGENTS.md", ROOT / "VERIFICATION.md"]


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
supported = [v for v in manifest.get("versions", []) if v.get("status") == "supported"]
if not supported:
    fail("MANIFEST has no supported versions")

installer = INSTALLER.read_text(encoding="utf-8")
for entry in supported:
    for key in ("original_sha256", "patched_sha256", "patch_sha256"):
        value = entry.get(key)
        if not value or len(value) != 64:
            fail(f"{entry['version']} {key} is not a 64-char sha256")
        if value not in installer:
            fail(f"install.sh is missing {entry['version']} {key}={value}")

# Docs are optional in internal source checkouts; when present they must be current.
present_docs = [p for p in DOCS if p.exists()]
for doc in present_docs:
    text = doc.read_text(encoding="utf-8")
    for entry in supported:
        for key in ("original_sha256", "patched_sha256", "patch_sha256"):
            if entry[key] not in text:
                fail(f"{doc.name} is missing {entry['version']} {key}={entry[key]}")

# Generated installer block must be exactly one and match manifest order.
blocks = re.findall(r"# BEGIN GENERATED VERSIONS(.*?)# END GENERATED VERSIONS", installer, re.S)
if len(blocks) != 1:
    fail(f"install.sh must have exactly one generated VERSIONS block, found {len(blocks)}")
for entry in supported:
    expected = f'{entry["version"]} {entry["original_sha256"]} {entry["patched_sha256"]} {entry["patch_sha256"]}'
    if expected not in blocks[0]:
        fail(f"install.sh VERSIONS block is stale for {entry['version']}")

# Upgrade deltas must be listed in the installer and in SHA256SUMS.
upgrades = manifest.get("upgrades", [])
if upgrades:
    upgrade_blocks = re.findall(r"# BEGIN GENERATED UPGRADES(.*?)# END GENERATED UPGRADES", installer, re.S)
    if len(upgrade_blocks) != 1:
        fail(f"install.sh must have exactly one generated UPGRADES block, found {len(upgrade_blocks)}")
    sums = (ROOT / "patches" / "SHA256SUMS").read_text(encoding="utf-8")
    for upgrade in upgrades:
        expected = f'{upgrade["from_sha256"]} {upgrade["to_sha256"]} {upgrade["patch_sha256"]}'
        if expected not in upgrade_blocks[0]:
            fail(f"install.sh UPGRADES block is stale for {upgrade['patch']}")
        if upgrade["patch_sha256"] not in sums:
            fail(f"patches/SHA256SUMS is missing {upgrade['patch']}")
        for doc in present_docs:
            text = doc.read_text(encoding="utf-8")
            if upgrade["from_sha256"] not in text:
                fail(f"{doc.name} is missing the upgradable source SHA-256 {upgrade['from_sha256']}")

print(f"release checks OK: {len(supported)} supported version(s), {len(upgrades)} upgrade(s), {len(present_docs)} docs")
