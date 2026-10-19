import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")
old='''				if (info?.kind === "final") {
					renderEpoch += 1;
					clearWaitingRefreshTimer();
					toolPhaseStartedAt = 0;
					clearCardStatusLines();
					flushCardUpdate(true);
				}'''
new='''				if (info?.kind === "final") {
					renderEpoch += 1;
					clearWaitingRefreshTimer();
					clearCardStatusLines();
					flushCardUpdate(true);
				}'''
assert old in t
p.write_text(t.replace(old,new,1),encoding="utf-8",newline="\n")
print("final tool timer preserved")
