import pathlib
for fname in ("test-wayC-105.mjs","test-narration-ticker-105.mjs","audit-agg-105.mjs"):
    p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\tests")/fname
    t=p.read_text(encoding="utf-8")
    # replace the common old sequence with new branch
    t=t.replace("else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\) \\|\\| narrationLine\\) clearCardStatusLines\\(\\);","else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\)\\) clearCardStatusLines\\(\\);")
    # narration test has similar escaped variant
    t=t.replace("else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\) \\|\\| narrationLine\\) clearCardStatusLines\\(\\);","else if \\(streamText\\.trim\\(\\) \\|\\| reasoningText\\.trim\\(\\)\\) clearCardStatusLines\\(\\);")
    p.write_text(t,encoding="utf-8",newline="\n")
print("patterns updated")
