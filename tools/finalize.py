# -*- coding: utf-8 -*-
"""Regenerate the fixed patch from final patched.mjs and sync all hashes/docs."""
import difflib
import hashlib
import pathlib
import re

ROOT = pathlib.Path(r"D:\deepseek\review-wayE\fixed")
BASE = ROOT / "patches" / "2026.10.5"
ORIG = BASE / "original.mjs"
PATCHED = BASE / "patched.mjs"
PATCH = BASE / "feishu-tool-aggregation.patch"


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


orig_text = ORIG.read_text(encoding="utf-8")
patched_text = PATCHED.read_text(encoding="utf-8")
assert "\r\n" not in orig_text and "\r\n" not in patched_text

diff = difflib.unified_diff(
    orig_text.splitlines(), patched_text.splitlines(),
    fromfile="original.mjs", tofile="patched.mjs", lineterm="",
)
patch_text = "\n".join(diff) + "\n"
PATCH.write_text(patch_text, encoding="utf-8", newline="\n")
hunks = patch_text.count("\n@@ ")

h_orig = sha_bytes(ORIG.read_bytes())
h_patched = sha_bytes(PATCHED.read_bytes())
h_patch = sha_bytes(patch_text.encode())
print(f"hunks={hunks}")
print(f"orig   ={h_orig}")
print(f"patched={h_patched}")
print(f"patch  ={h_patch}")

# ---- MANIFEST.json ----
import json
manifest_path = ROOT / "patches" / "MANIFEST.json"
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in manifest.get("versions", []):
        if entry.get("version") == "2026.10.5":
            entry["original_sha256"] = h_orig
            entry["patched_sha256"] = h_patched
            entry["patch_sha256"] = h_patch
            entry["patch"] = "2026.10.5/feishu-tool-aggregation.patch"
            entry["tests"] = "tests/run-all.mjs"
            entry["adapter"] = "anchor-rebase-v1"
            entry["status"] = "supported"
    manifest["current"] = "2026.10.5"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"manifest={manifest_path}")

# ---- SHA256SUMS ----
sums_path = ROOT / "patches" / "SHA256SUMS"
lines = sums_path.read_text(encoding="utf-8").splitlines()
for n, ln in enumerate(lines):
    if ln.endswith("2026.10.5/feishu-tool-aggregation.patch"):
        lines[n] = f"{h_patch}  2026.10.5/feishu-tool-aggregation.patch"
    elif ln.endswith("2026.10.5/patched.mjs"):
        lines[n] = f"{h_patched}  2026.10.5/patched.mjs"
    elif ln.endswith("2026.10.5/original.mjs"):
        lines[n] = f"{h_orig}  2026.10.5/original.mjs"
sums_path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

# ---- install.sh ----
inst_path = ROOT / "install.sh"
inst = inst_path.read_text(encoding="utf-8")
inst, n = re.subn(
    r'"2026\.10\.5 [0-9a-f]{64} [0-9a-f]{64} \$HERE/patches/2026\.10\.5/feishu-tool-aggregation\.patch"',
    f'"2026.10.5 {h_orig} {h_patched} $HERE/patches/2026.10.5/feishu-tool-aggregation.patch"',
    inst,
)
assert n == 1, n
assert 'if ! patch -p0 "$TARGET" < "$PATCH"; then' in inst
inst_path.write_text(inst, encoding="utf-8", newline="\n")

# ---- README ----
rd_path = ROOT / "README.md"
rd = rd_path.read_text(encoding="utf-8")
rd, n = re.subn(r"The patch \(\d+ hunks\)", f"The patch ({hunks} hunks)", rd)
assert n == 1, n
# layout text is version-agnostic in the single-version layout
rd, n = re.subn(
    r"(\| `@openclaw/feishu` 2026\.10\.5 \| `patches/2026\.10\.5/feishu-tool-aggregation\.patch` \| `[0-9a-f]{8}…[0-9a-f]{4}` \| `)[0-9a-f]{8}…[0-9a-f]{4}(` \|)",
    rf"\g<1>{h_patched[:8]}…{h_patched[-4:]}\g<2>",
    rd,
)
assert n == 1, n
rd_path.write_text(rd, encoding="utf-8", newline="\n")

# ---- consistency re-checks ----
sums = sums_path.read_text(encoding="utf-8")
for h in (h_orig, h_patched, h_patch):
    assert h in sums, h
assert f"The patch ({hunks} hunks)" in rd
print("metadata synced OK")
